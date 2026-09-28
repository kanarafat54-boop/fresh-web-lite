import {
  type EventFabric,
  createEventEnvelope,
} from "./eventFabric";
import {
  type MediaComputeJob,
  type MediaComputeStage,
  type MediaComputeWorker,
  canRetry,
  nextRetryDelayMs,
} from "./mediaComputeFabric";

export type MediaJobEvent =
  | { kind: "job.queued"; jobId: string; assetId: string }
  | { kind: "job.stage.started"; jobId: string; stage: MediaComputeStage }
  | { kind: "job.stage.completed"; jobId: string; stage: MediaComputeStage; outputIds: string[] }
  | { kind: "job.stage.failed"; jobId: string; stage: MediaComputeStage; retryable: boolean; error?: string }
  | { kind: "job.completed"; jobId: string; assetId: string };

export class MediaPipelineOrchestrator {
  constructor(
    private readonly events: EventFabric,
    private readonly worker: MediaComputeWorker,
  ) {}

  async run(job: MediaComputeJob): Promise<MediaComputeJob> {
    let current: MediaComputeJob = { ...job, status: "running" };

    await this.events.publish(
      createEventEnvelope({
        topic: "media.job",
        partitionKey: current.assetId,
        producer: "fresh-media-orchestrator",
        priority: "high",
        payload: {
          kind: "job.queued",
          jobId: current.id,
          assetId: current.assetId,
        } satisfies MediaJobEvent,
      }),
    );

    for (const stage of current.stages) {
      if (!this.worker.supports(stage)) {
        current = { ...current, status: "failed" };
        await this.publishFailure(current, stage, false, "No worker supports this media stage.");
        return current;
      }

      await this.events.publish(
        createEventEnvelope({
          topic: "media.stage",
          partitionKey: current.assetId,
          producer: "fresh-media-orchestrator",
          priority: "normal",
          payload: {
            kind: "job.stage.started",
            jobId: current.id,
            stage,
          } satisfies MediaJobEvent,
        }),
      );

      const result = await this.worker.execute(current, stage);

      if (result.status === "succeeded") {
        await this.events.publish(
          createEventEnvelope({
            topic: "media.stage",
            partitionKey: current.assetId,
            producer: "fresh-media-orchestrator",
            priority: "normal",
            payload: {
              kind: "job.stage.completed",
              jobId: current.id,
              stage,
              outputIds: result.outputIds ?? [],
            } satisfies MediaJobEvent,
          }),
        );
        continue;
      }

      const retryable = result.status === "retryable" && canRetry(current);

      if (retryable) {
        current = {
          ...current,
          attempt: current.attempt + 1,
          status: "queued",
        };
        await this.publishFailure(current, stage, true, result.error);
        await new Promise((resolve) => setTimeout(resolve, nextRetryDelayMs(current.attempt)));
        return this.run(current);
      }

      current = { ...current, status: "failed" };
      await this.publishFailure(current, stage, false, result.error);
      return current;
    }

    current = { ...current, status: "succeeded" };

    await this.events.publish(
      createEventEnvelope({
        topic: "media.job",
        partitionKey: current.assetId,
        producer: "fresh-media-orchestrator",
        priority: "high",
        payload: {
          kind: "job.completed",
          jobId: current.id,
          assetId: current.assetId,
        } satisfies MediaJobEvent,
      }),
    );

    return current;
  }

  private async publishFailure(
    job: MediaComputeJob,
    stage: MediaComputeStage,
    retryable: boolean,
    error?: string,
  ) {
    await this.events.publish(
      createEventEnvelope({
        topic: "media.stage",
        partitionKey: job.assetId,
        producer: "fresh-media-orchestrator",
        priority: retryable ? "normal" : "high",
        payload: {
          kind: "job.stage.failed",
          jobId: job.id,
          stage,
          retryable,
          error,
        } satisfies MediaJobEvent,
      }),
    );
  }
}
