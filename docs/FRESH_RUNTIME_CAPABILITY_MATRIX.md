# Fresh Runtime Capability Matrix

Updated: 2026-09-29

## Implemented and executable

| Capability | Runtime | Status |
|---|---|---|
| Local media preview | Browser | Implemented |
| Playback position persistence | Browser IndexedDB | Implemented |
| Playback speed | Browser | Implemented |
| WASM execution | Browser | Implemented |
| Canvas video export | Browser | Implemented |
| 9:16 / 16:9 / 1:1 crop | Browser | Implemented |
| Non-destructive trim | Browser | Implemented |
| Color grade | Browser | Implemented |
| Text overlay | Browser renderer | Implemented |
| Creator handoff | Browser | Implemented |
| Recommendation reranking | Browser | Implemented |
| Media job orchestration | Application | Contract implemented |

## Still not production runtime

- Full FFmpeg/WebAssembly NLE
- Distributed FFmpeg/GPU workers
- S3T/Demucs stem separation
- YOLO/MediaPipe tracking
- Whisper transcription
- NMT translation
- Voice-cloned TTS
- Production HLS/DASH packaging and ABR
- Redis Pub/Sub + Kafka production transport
- WebRTC broadcast backend
- Multimodal embeddings + managed vector DB
- LLM comment signal ranking
- Stripe production settlement
- Smart-contract settlement
- Production copyright fingerprinting/arbitration

These are not marked complete until a real runtime has been deployed and exercised.

## Verification rule

A feature is implemented only when code executes a real browser/server API or deployed service, the result is observable, failure is surfaced, successful state is persisted where required, and a build/runtime check verifies the path. Architecture interfaces alone do not satisfy this rule.
