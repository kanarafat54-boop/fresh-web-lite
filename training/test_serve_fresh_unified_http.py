"""HTTP boundary tests for Fresh Unified's fail-closed serving service."""
from __future__ import annotations

import http.client
import os
import sys
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
from serve_fresh_unified_http import FreshRuntime, Handler


class FreshHttpBoundaryTests(unittest.TestCase):
    def setUp(self):
        with patch.dict(os.environ, {}, clear=True):
            self.runtime = FreshRuntime()
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.server.runtime = self.runtime
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.port = self.server.server_address[1]

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def request(self, method, path, body=None, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=3)
        conn.request(method, path, body=body, headers=headers or {})
        response = conn.getresponse()
        result = response.status, response.read()
        conn.close()
        return result

    def test_health_is_not_ready_without_promoted_artifacts(self):
        status, body = self.request("GET", "/healthz")
        self.assertEqual(status, 503)
        self.assertIn(b'"status": "training-required"', body)

    def test_generation_requires_authentication(self):
        status, body = self.request(
            "POST", "/v1/generate",
            body=b'{"prompt":"hello"}',
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(status, 401)
        self.assertEqual(body, b'{"error": "unauthorized"}')

    def test_unknown_route_is_not_found(self):
        status, _body = self.request("GET", "/internal")
        self.assertEqual(status, 404)


if __name__ == "__main__":
    unittest.main()
