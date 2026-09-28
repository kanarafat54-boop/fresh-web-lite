# Fresh Web Lite — Distributed Compute & Streaming Architecture

## Purpose

Fresh Web Lite uses a capability-first architecture so browser execution, edge execution, and distributed workers can evolve independently.

The product does not require Kafka, Redis, Kubernetes, a GPU cluster, or a vector database to exist in the browser. Feature code talks to stable platform contracts and infrastructure adapters provide the production implementation.

## 1. Client Execution Fabric

The browser is a real compute surface:

- WebAssembly for local media and deterministic compute modules.
- WebGPU for supported accelerated workloads.
- WebAudio for waveform/audio processing.
- MediaSource Extensions for adaptive media playback.
- IndexedDB for durable client playback state.

## 2. Event / Streaming Fabric

All high-volume asynchronous work should be modeled as events:

feature -> event envelope -> stream adapter -> consumers -> durable state

The first implementation provides LocalEventFabric for deterministic browser behavior. A server adapter can later map the same contract to Kafka, Redis Streams, NATS, or another event platform.

Required production properties:

- partitioning by stable entity key;
- idempotency keys;
- schema versions;
- priority classes;
- bounded retries;
- dead-letter handling;
- observability and tracing.

## 3. Media Compute Fabric

Media work is represented as a durable job rather than a synchronous HTTP request.

ingest -> probe -> transcode -> AI analysis -> repurpose -> translate -> synthesize -> package -> publish

Compute classes:

- interactive: local/browser-first operations;
- realtime: low-latency edge operations;
- batch: CPU worker workloads;
- gpu-batch: model-heavy media processing.

The worker interface deliberately avoids coupling the product to one cloud provider.

## 4. Recommendation / Vector Fabric

Recommendation is separated into:

1. candidate retrieval;
2. semantic similarity;
3. business/product constraints;
4. personalized reranking.

The vector store is an adapter boundary. Milvus, pgvector, FAISS, or another implementation can be introduced without changing Fresh Flow.

## 5. Playback State

Playback position and playback rate are persisted locally with IndexedDB and a memory fallback. Server synchronization should be event-driven and conflict-aware rather than writing on every playback tick.

## 6. Concurrency Model

High-concurrency paths should use:

- stateless API workers;
- asynchronous jobs for expensive work;
- partitioned streams;
- idempotent consumers;
- bounded queues;
- cache layers;
- durable object storage;
- read-optimized projections;
- observability at every boundary.

Avoid synchronous chains such as:

upload -> transcode -> transcription -> translation -> publish

The user-facing request should enqueue work and return a durable job identifier.

## 7. Evolution Path

The platform can scale without rewriting feature code:

local/browser -> single service -> horizontally scaled services -> regional event fabric -> global distributed fabric

This is the foundation for high-concurrency Fresh Flow, Fresh Studio, Creator, Fresh Intelligence, and future ecosystems.
