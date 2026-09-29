export type FreshFlowTelemetryEvent =
  | "impression" | "play_start" | "play_25" | "play_50" | "play_75" | "complete"
  | "skip" | "like" | "save" | "share" | "comment_open" | "search" | "report";

export type FreshFlowTelemetryRecord = {
  event: FreshFlowTelemetryEvent;
  mediaId: string;
  world: string;
  sessionId: string;
  positionMs?: number;
  durationMs?: number;
  timestamp: number;
};

const MAX_BATCH = 40;

export class FreshFlowTelemetryBuffer {
  private readonly records: FreshFlowTelemetryRecord[] = [];

  push(record: Omit<FreshFlowTelemetryRecord, "timestamp">) {
    if (this.records.length >= MAX_BATCH) this.records.shift();
    this.records.push({ ...record, timestamp: Date.now() });
  }

  drain(): FreshFlowTelemetryRecord[] {
    return this.records.splice(0, this.records.length);
  }

  size() {
    return this.records.length;
  }
}
