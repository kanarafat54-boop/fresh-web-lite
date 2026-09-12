import { readFileSync } from "node:fs";

const job = readFileSync("src/core/fresh-ai/FreshUnifiedTrainingJob.ts", "utf8");
const provenance = readFileSync("src/core/fresh-ai/FreshTrainingDataProvenance.ts", "utf8");

const requiredJobTerms = [
  'fresh-unified-training-job-v1',
  'fresh-unified-1',
  'datasetSha256',
  'curriculumId',
  'tokenizer',
  'learningRate',
  'microBatchSize',
  'sequenceLength',
  'outputCheckpointId',
  'evaluationGateIds',
  'safetyGateIds',
  'requiredDataLicenses',
  'hardware',
  '"planned" | "queued" | "running" | "evaluating" | "validated" | "failed"',
];
for (const term of requiredJobTerms) {
  if (!job.includes(term)) throw new Error(`Missing training-job contract term: ${term}`);
}
for (const term of ['sourceType', 'license', 'permittedForTraining', 'attributionRequired', 'validateFreshTrainingDataSources']) {
  if (!provenance.includes(term)) throw new Error(`Missing provenance contract term: ${term}`);
}
if (!job.includes('requiresExternalModelProvider: false')) throw new Error('Training job must not require an external model provider');
console.log('Fresh Unified real training job contract: PASS');
console.log('Data provenance contract: PASS');
console.log('Training status: NOT TRAINED — this commit defines the job/provenance boundary only.');
