/** Provenance contract for data entering Fresh Unified training. */
export type FreshTrainingSourceType = "synthetic" | "public" | "licensed" | "authorized";

export type FreshTrainingDataSource = {
  sourceId: string;
  sourceType: FreshTrainingSourceType;
  title: string;
  locator: string;
  license: string;
  permittedForTraining: boolean;
  attributionRequired: boolean;
  attribution?: string;
  collectedAt: string;
};

export function validateFreshTrainingDataSource(source: FreshTrainingDataSource): void {
  if (!source.sourceId.trim() || !source.title.trim() || !source.locator.trim()) throw new Error("Training source identity is required");
  if (!source.license.trim()) throw new Error("Training source license is required");
  if (!source.collectedAt.trim() || Number.isNaN(Date.parse(source.collectedAt))) throw new Error("Training source collectedAt must be an ISO date");
  if (!source.permittedForTraining) throw new Error(`Training source ${source.sourceId} is not permitted for training`);
  if (source.attributionRequired && !source.attribution?.trim()) throw new Error(`Training source ${source.sourceId} requires attribution`);
}

export function validateFreshTrainingDataSources(sources: FreshTrainingDataSource[]): void {
  if (sources.length === 0) throw new Error("A training run requires data provenance records");
  const ids = new Set<string>();
  for (const source of sources) {
    if (ids.has(source.sourceId)) throw new Error(`Duplicate training source: ${source.sourceId}`);
    ids.add(source.sourceId);
    validateFreshTrainingDataSource(source);
  }
}
