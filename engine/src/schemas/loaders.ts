import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { repoRoot } from "../../lib/paths.ts";

const ajv = addFormats(new Ajv2020({ strict: true, allErrors: true }));

const validatorCache = new Map<string, ValidateFunction>();

function loadSchema(filename: string): ValidateFunction {
  const cached = validatorCache.get(filename);
  if (cached) return cached;
  const path = join(repoRoot(), ".ai/core/schemas", filename);
  const schema = JSON.parse(readFileSync(path, "utf-8"));
  const fn = ajv.compile(schema);
  validatorCache.set(filename, fn);
  return fn;
}

export const loadFeatureMetadataValidator = () => loadSchema("FeatureMetadata.v1.schema.json");
export const loadFeatureManifestValidator = () => loadSchema("FeatureManifest.v2.schema.json");
export const loadHandoffV2Validator = () =>
  loadSchema("PlaywrightAutomationHandoff.v2.schema.json");
export const loadSourceRefRegistryValidator = () => loadSchema("SourceRefRegistry.v1.schema.json");
