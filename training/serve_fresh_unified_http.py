"""Small standard-library HTTP wrapper for a locally promoted Fresh Unified model.

No provider fallback, no artifact download, no prompt logging. Configure artifact
paths and a serving token; without valid promoted artifacts, generation stays 503.
"""
from __future__ import annotations

import hmac
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock

from serve_fresh_unified import (
    BOS, EOS, SEP, BYTE_OFFSET, decode_token_ids, validate_artifacts,
)

MAX_BODY_BYTES = 32 * 1024
MAX_NEW_TOKENS = 128


class FreshRuntime:
    def __init__(self):
        self.status = "training-required"
        self.reason = "Promoted local checkpoint, tokenizer, and serving token are required"
        self.model = None
        self.device = None
        self.merges = []
        self.spec = {}
        self.serving_token = os.environ.get("FRESH_AI_SERVING_TOKEN", "")
        self.lock = Lock()

        checkpoint = os.environ.get("FRESH_UNIFIED_CHECKPOINT_PATH")
        tokenizer = os.environ.get("FRESH_UNIFIED_TOKENIZER_PATH")
        spec_path = os.environ.get("FRESH_UNIFIED_MODEL_SPEC_PATH", str(Path(__file__).with_name("model_spec.json")))
        if not checkpoint or not tokenizer:
            return
        if len(self.serving_token) < 32:
            self.reason = "FRESH_AI_SERVING_TOKEN must be configured with at least 32 characters"
            return

        try:
            checkpoint_path, tokenizer_path, model_spec_path = Path(checkpoint), Path(tokenizer), Path(spec_path)
            _manifest, tokenizer_artifact, _tokenizer_manifest, self.spec = validate_artifacts(
                checkpoint_path, tokenizer_path, model_spec_path
            )
            import torch
            from fresh_model import build_fresh_model

            self.merges = [
                (bytes.fromhex(row["left"]), bytes.fromhex(row["right"]), int(row["tokenId"]))
                for row in tokenizer_artifact.get("merges", [])
            ]
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self.model = build_fresh_model(self.spec).to(self.device)
            payload = torch.load(checkpoint_path, map_location=self.device, weights_only=True)
            if payload.get("model_id") != "fresh-unified-1" or payload.get("tokenizer_id") != "fresh-unified-tokenizer-v1":
                raise ValueError("Checkpoint payload identity mismatch")
            self.model.load_state_dict(payload["state_dict"], strict=True)
            self.model.eval()
            self.status = "ready"
            self.reason = ""
        except (OSError, ValueError, KeyError, ImportError, RuntimeError) as exc:
            # Avoid returning filesystem paths or exception details to HTTP callers.
            self.reason = f"Artifact validation/loading failed ({type(exc).__name__})"

    def generate(self, prompt: str, max_new_tokens: int) -> str:
        from fresh_trained_tokenizer import encode
        import torch

        prompt_ids = [BOS] + encode(prompt, self.merges) + [SEP]
        context = int(self.spec["contextLength"])
        if len(prompt_ids) >= context:
            raise ValueError("Prompt exceeds the configured model context")
        generated = list(prompt_ids)
        with self.lock, torch.inference_mode():
            for _ in range(max_new_tokens):
                input_ids = torch.tensor([generated[-context:]], dtype=torch.long, device=self.device)
                logits, _ = self.model(input_ids)
                next_id = int(torch.argmax(logits[0, -1]).item())
                if next_id == EOS:
                    break
                generated.append(next_id)
        return decode_token_ids(generated[len(prompt_ids):], self.merges)


class Handler(BaseHTTPRequestHandler):
    server_version = "FreshUnifiedServing"
    sys_version = ""

    def log_message(self, _format, *_args):
        # Default HTTP logs can leak client addresses and request details; omit them.
        return

    @property
    def runtime(self) -> FreshRuntime:
        return self.server.runtime  # type: ignore[attr-defined]

    def _send(self, status: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path != "/healthz":
            self._send(404, {"error": "not_found"})
            return
        if self.runtime.status != "ready":
            self._send(503, {"status": self.runtime.status})
            return
        self._send(200, {"status": "ready", "model": "fresh-unified-1"})

    def do_POST(self):
        if self.path != "/v1/generate":
            self._send(404, {"error": "not_found"})
            return
        expected = self.runtime.serving_token
        supplied = self.headers.get("Authorization", "")
        if not expected or not hmac.compare_digest(supplied, "Bearer " + expected):
            self._send(401, {"error": "unauthorized"})
            return
        if self.runtime.status != "ready":
            self._send(503, {"error": "training_required"})
            return
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            self._send(415, {"error": "application_json_required"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send(400, {"error": "invalid_content_length"})
            return
        if length < 1 or length > MAX_BODY_BYTES:
            self._send(413, {"error": "request_size_out_of_range"})
            return
        try:
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError("JSON object required")
            prompt = payload.get("prompt")
            count = payload.get("max_new_tokens", 64)
            if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 16000:
                self._send(400, {"error": "prompt_invalid"})
                return
            if isinstance(count, bool) or not isinstance(count, int) or not 1 <= count <= MAX_NEW_TOKENS:
                self._send(400, {"error": "max_new_tokens_out_of_range"})
                return
            text = self.runtime.generate(prompt.strip(), count)
            self._send(200, {"model": "fresh-unified-1", "text": text})
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            self._send(400, {"error": "invalid_request"})
        except Exception:
            # Never expose prompts, artifact paths, stack traces, or internal errors.
            self._send(500, {"error": "generation_failed"})


def main() -> int:
    host = os.environ.get("FRESH_AI_SERVING_HOST", "127.0.0.1")
    port_text = os.environ.get("PORT", os.environ.get("FRESH_AI_SERVING_PORT", "8787"))
    try:
        port = int(port_text)
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        print("Invalid serving port", file=sys.stderr)
        return 2
    runtime = FreshRuntime()
    server = ThreadingHTTPServer((host, port), Handler)
    server.runtime = runtime  # type: ignore[attr-defined]
    print(f"Fresh Unified server bound on {host}:{port}; status={runtime.status}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
