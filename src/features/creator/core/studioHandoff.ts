/**
 * A finished Fresh Studio export waiting to be published as a Short.
 * It lives only in memory for the current visit: the creator screen takes it once, and a page reload drops it
 * (the person can still save the video and upload it by hand). Nothing is stored on a server by this step.
 */
let waiting: File | null = null;

export const STUDIO_HANDOFF_ACTION = "studio-export";

export function stageStudioExport(file: File): void {
  waiting = file;
}

/** Returns the waiting export once, then forgets it. */
export function takeStudioExport(): File | null {
  const file = waiting;
  waiting = null;
  return file;
}
