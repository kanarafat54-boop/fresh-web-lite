export function transformLacunaRows(lines, metadata) {
  const { datasetId, revision, config, split, sourceSha256, candidateId, authorizationId, license, evidenceRef, sourceLicenseEvidenceRef } = metadata;
  if (split !== "train") throw new Error("only the train split may be transformed for training; validation/test are held out");
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("dataset export is empty");
  if (lines.length > 100000) throw new Error("dataset export exceeds the 100,000-row pilot limit");

  const seen = new Set();
  const examples = [];
  let skippedReverseDirectionCount = 0;
  for (let index = 0; index < lines.length; index += 1) {
    let row;
    try { row = JSON.parse(lines[index]); } catch { throw new Error(`invalid JSON on source line ${index + 1}`); }
    const sourceId = String(row.translation_id ?? "").trim();
    const sourceText = String(row.source_statement ?? "").trim();
    const targetText = String(row.approved_translation ?? "").trim();
    const sourceLanguage = String(row.source_language ?? "").trim().toLowerCase();
    const targetLanguage = String(row.target_language ?? "").trim().toLowerCase();
    if (!sourceId || !sourceText || !targetText) throw new Error(`source line ${index + 1} is missing a translation ID or text`);
    if (seen.has(sourceId)) throw new Error(`duplicate translation ID: ${sourceId}`);
    seen.add(sourceId);
    if (row.split && row.split !== "train") throw new Error(`source line ${index + 1} claims split ${row.split}; refusing leakage into train`);
    if (sourceText.length > 50000 || targetText.length > 50000) throw new Error(`source line ${index + 1} exceeds the text length limit`);
    if (sourceLanguage === "luganda" && targetLanguage === "english") {
      skippedReverseDirectionCount += 1;
      continue;
    }
    if (sourceLanguage !== "english" || targetLanguage !== "luganda") {
      throw new Error(`source line ${index + 1} has an unsupported language direction`);
    }
    examples.push({
      id: `hf-lacuna-luganda-${sourceId}`,
      input: `Translate the following English health text into Luganda. Preserve the source meaning and uncertainty. This is translation training material, not medical advice.\n\nEnglish: ${sourceText}`,
      target: targetText,
      metadata: {
        domain: "translation-health",
        direction: "en-to-lg",
        sourceType: "huggingface-dataset",
        datasetId,
        datasetRevision: revision,
        datasetConfig: config,
        split,
        sourceRowId: sourceId,
        candidateId,
        authorizationId,
        license,
        evidenceRef,
        sourceLicenseEvidenceRef,
        sourceSha256,
        transformation: "fresh-hf-translation-v1",
        rightsReview: "passed",
        privacyReview: "passed",
        safetyReview: "passed",
        qualityReview: "passed",
        reviewStatus: "authorized-reviewed",
      },
    });
  }
  if (!examples.length) throw new Error("no English-to-Luganda rows were found in the training split");
  return { examples, skippedReverseDirectionCount };
}
