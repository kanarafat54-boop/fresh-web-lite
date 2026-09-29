export type MediaEdit =
  | { type: "trim"; start: number; end: number }
  | { type: "split"; at: number }
  | { type: "crop"; aspect: "9:16" | "16:9" | "1:1"; focus?: string }
  | { type: "grade"; preset: string; intensity: number }
  | { type: "text"; text: string; start: number; end: number }
  | { type: "audio"; lane: "voice" | "music" | "ambient"; gain: number }
  | { type: "dub"; language: string; voice?: string };

export type RenderDocument = {
  version: 1;
  source: { id: string; duration?: number; mimeType?: string };
  edits: MediaEdit[];
  output: { format: "mp4" | "webm" | "hls"; width: number; height: number };
};

export type RenderJob = {
  id: string;
  document: RenderDocument;
  status: "draft" | "queued" | "rendering" | "complete" | "failed";
  execution: "device" | "cloud";
};

export function createRenderDocument(sourceId: string): RenderDocument {
  return {
    version: 1,
    source: { id: sourceId },
    edits: [],
    output: { format: "mp4", width: 1080, height: 1920 },
  };
}

export function addEdit(document: RenderDocument, edit: MediaEdit): RenderDocument {
  return { ...document, edits: [...document.edits, edit] };
}

export function serializeRenderDocument(document: RenderDocument): string {
  return JSON.stringify(document);
}

export function validateRenderDocument(document: RenderDocument): string[] {
  const errors: string[] = [];
  if (document.version !== 1) errors.push("Unsupported render document version.");
  if (!document.source.id) errors.push("Render source id is required.");
  if (!document.output.width || !document.output.height) errors.push("Render output dimensions are required.");
  for (const edit of document.edits) {
    if (edit.type === "trim" && (edit.start < 0 || edit.end <= edit.start)) errors.push("Trim range is invalid.");
    if (edit.type === "grade" && (edit.intensity < 0 || edit.intensity > 1)) errors.push("Grade intensity must be 0..1.");
    if (edit.type === "text" && edit.end <= edit.start) errors.push("Text overlay range is invalid.");
  }
  return errors;
}

export function createRenderJob(document: RenderDocument, execution: RenderJob["execution"] = "cloud"): RenderJob {
  const errors = validateRenderDocument(document);
  if (errors.length) throw new Error(errors[0]);
  return { id: crypto.randomUUID(), document, status: "queued", execution };
}
