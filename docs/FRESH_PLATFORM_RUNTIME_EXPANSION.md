# Fresh Platform Runtime Expansion

Implemented runtime paths now shared across Fresh Flow, Studio and future backend adapters:

- **Recommendation:** weighted reranking plus optional embedding cosine similarity. The existing formula remains the base ranking model; semantic similarity can be added without requiring a vector database.
- **Realtime:** Supabase Realtime broadcast transport is executable in-browser. WebSocket transport remains available for a dedicated gateway.
- **Media pipeline:** jobs now have stage progress and a resumable runner. AI stages remain adapter points until real inference services are deployed.
- **Playback:** Studio already persists position/rate in IndexedDB and supports 0.05x controls through 3x.
- **Studio → Creator → Flow:** existing session handoff and canonical publishing repository remain the publishing path.
- **Escrow:** state transitions now validate inputs and support explicit refund state. This is a ledger state machine, not a payment processor.
- **Browser AI:** Web Speech Recognition is an optional local transcription capability. It is a browser fallback, not a Whisper replacement.

## Production boundary

Not claimed as deployed by this change:
FFmpeg GPU clusters, Demucs/S3T, YOLO/MediaPipe, Whisper, NMT/TTS voice cloning, HLS/DASH packaging, Redis/Kafka, WebRTC media backend, vector database, Stripe/smart-contract settlement, copyright fingerprinting.

Those require external runtime services and should plug into the interfaces already established here.
