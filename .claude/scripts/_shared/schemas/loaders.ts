import { readFileSync } from "node:fs";
import { sharedSchemasPath } from "@shared/lib/paths.ts";
import type { ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

const ajv = addFormats(new Ajv2020({ strict: true, allErrors: true }));

const validatorCache = new Map<string, ValidateFunction>();

function loadSchema(filename: string): ValidateFunction {
  const cached = validatorCache.get(filename);
  if (cached) return cached;
  const path = sharedSchemasPath(filename);
  const schema = JSON.parse(readFileSync(path, "utf-8"));
  const fn = ajv.compile(schema);
  validatorCache.set(filename, fn);
  return fn;
}

export const loadFeatureMetadataValidator = () => loadSchema("FeatureMetadata.v1.schema.json");
export const loadFeatureMetadataV2Validator = () => loadSchema("FeatureMetadata.v2.schema.json");
export const loadFeatureManifestValidator = () => loadSchema("FeatureManifest.v2.schema.json");
export const loadHandoffV2Validator = () =>
  loadSchema("PlaywrightAutomationHandoff.v2.schema.json");

/** JSON Schema cannot express total = passed + failed + skipped. */
export function handoffV2SemanticErrors(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const results = (value as { results?: unknown }).results;
  if (!results || typeof results !== "object") return [];
  const counts = results as Record<"total" | "passed" | "failed" | "skipped", unknown>;
  if (
    [counts.total, counts.passed, counts.failed, counts.skipped].some(
      (count) => typeof count !== "number",
    )
  ) {
    return [];
  }
  const observed =
    (counts.passed as number) + (counts.failed as number) + (counts.skipped as number);
  return counts.total === observed
    ? []
    : [`results.total=${counts.total} does not equal passed+failed+skipped=${observed}`];
}
export const loadFeatureSourceSnapshotValidator = () =>
  loadSchema("FeatureSourceSnapshot.v1.schema.json");
export const loadFeatureSourceSnapshotV2Validator = () =>
  loadSchema("FeatureSourceSnapshot.v2.schema.json");
export const loadCoverageMatrixValidator = () => loadSchema("CoverageMatrix.v1.schema.json");
export const loadCaseEvidenceMapValidator = () => loadSchema("CaseEvidenceMap.v1.schema.json");
export const loadWorkerStatusEnvelopeValidator = () =>
  loadSchema("WorkerStatusEnvelope.v1.schema.json");
