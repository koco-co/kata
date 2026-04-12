import type { AiCoreIssue, AiCoreResult } from "./types.ts";

export type PluginManifestContract = {
  id: string;
  schemaRef: string;
  packageRoot: string;
  capability: {
    kind: string;
    network: string;
    secrets: string;
    isolation?: string;
  };
  argvRequired: string[];
  outputSchema: string;
  timeoutMs: string;
  artifactStaging: {
    enabled: string;
    root: string;
  };
};

type PluginManifestIssueCode =
  | "plugin_manifest.duplicate_key"
  | "plugin_manifest.missing_field"
  | "plugin_manifest.argv_required_missing"
  | "yaml.unsupported_indentation"
  | "yaml.unsupported_inline_comment"
  | "yaml.unsupported_block_scalar";

type ParsedKeyValue = { ok: true; key: string; value: string } | { ok: false; issue: AiCoreIssue };

type ParsedScalar = { ok: true; value: string } | { ok: false; issue: AiCoreIssue };

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const TOP_LEVEL_SCALARS = new Set([
  "id",
  "schema_ref",
  "package_root",
  "output_schema",
  "timeout_ms",
]);
const TOP_LEVEL_MAPS = new Set([
  "capability",
  "argv_schema",
  "artifact_staging",
  "capability_required",
]);
const REQUIRED_TOP_LEVEL = [
  "id",
  "schema_ref",
  "package_root",
  "capability",
  "argv_schema",
  "output_schema",
  "timeout_ms",
  "artifact_staging",
  "capability_required",
];
const REQUIRED_CAPABILITY = ["kind", "network", "secrets"];
const ALLOWED_CAPABILITY = new Set(["kind", "network", "secrets", "isolation"]);
const REQUIRED_ARTIFACT_STAGING = ["enabled", "root"];

export function parsePluginManifestContract(
  text: string,
  path: string,
): AiCoreResult<PluginManifestContract> {
  const issues: AiCoreIssue[] = [];
  const topLevelSeen = new Set<string>();
  const nestedSeen = new Map<string, Set<string>>();
  const values: Record<string, string> = {};
  const capability: Partial<PluginManifestContract["capability"]> = {};
  const artifactStaging: Partial<PluginManifestContract["artifactStaging"]> = {};
  const argvRequired: string[] = [];
  let activeTopLevel: string | undefined;
  let activeList: string | undefined;

  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

    const indent = raw.match(/^\s*/)?.[0] ?? "";
    if (indent.includes("\t") || ![0, 2, 4].includes(indent.length)) {
      issues.push(
        issue(
          "yaml.unsupported_indentation",
          `Unsupported PluginManifest indentation at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }

    if (indent.length === 0) {
      activeTopLevel = undefined;
      activeList = undefined;
      const parsed = parseKeyValue(trimmed, lineNumber, path);
      if (!parsed.ok) {
        issues.push(parsed.issue);
        continue;
      }
      if (!addKey(topLevelSeen, parsed.key, lineNumber, path, issues)) continue;
      if (TOP_LEVEL_MAPS.has(parsed.key)) {
        if (parsed.value.length !== 0) {
          issues.push(
            issue(
              "plugin_manifest.missing_field",
              `PluginManifest '${parsed.key}' must be a nested map at line ${lineNumber}.`,
              path,
            ),
          );
          continue;
        }
        activeTopLevel = parsed.key;
        nestedSeen.set(parsed.key, new Set<string>());
        continue;
      }
      if (!TOP_LEVEL_SCALARS.has(parsed.key)) {
        issues.push(
          issue(
            "plugin_manifest.missing_field",
            `Unknown PluginManifest top-level field '${parsed.key}' at line ${lineNumber}.`,
            path,
          ),
        );
        continue;
      }
      if (parsed.value.length === 0) {
        issues.push(
          issue(
            "plugin_manifest.missing_field",
            `PluginManifest '${parsed.key}' requires a scalar value at line ${lineNumber}.`,
            path,
          ),
        );
        continue;
      }
      const scalar = parseScalar(parsed.value, lineNumber, path);
      if (!scalar.ok) {
        issues.push(scalar.issue);
        continue;
      }
      values[parsed.key] = scalar.value;
      continue;
    }

    if (!activeTopLevel) {
      issues.push(
        issue(
          "yaml.unsupported_indentation",
          `Nested PluginManifest field has no parent at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }

    if (indent.length === 2) {
      activeList = undefined;
      if (activeTopLevel === "argv_schema") {
        const parsed = parseKeyValue(trimmed, lineNumber, path);
        if (!parsed.ok) {
          issues.push(parsed.issue);
          continue;
        }
        if (!addNestedKey(nestedSeen, activeTopLevel, parsed.key, lineNumber, path, issues))
          continue;
        if (parsed.key !== "required" || parsed.value.length !== 0) {
          issues.push(
            issue(
              "plugin_manifest.missing_field",
              `PluginManifest argv_schema only supports required list at line ${lineNumber}.`,
              path,
            ),
          );
          continue;
        }
        activeList = "argv_schema.required";
        continue;
      }

      const parsed = parseKeyValue(trimmed, lineNumber, path);
      if (!parsed.ok) {
        issues.push(parsed.issue);
        continue;
      }
      if (!addNestedKey(nestedSeen, activeTopLevel, parsed.key, lineNumber, path, issues)) continue;
      // capability_required sub-fields can have list values (empty or [])
      if (activeTopLevel === "capability_required") {
        if (!["fs_read", "fs_write", "net", "secret_refs"].includes(parsed.key)) {
          issues.push(
            issue(
              "plugin_manifest.missing_field",
              `Unknown PluginManifest capability_required field '${parsed.key}' at line ${lineNumber}.`,
              path,
            ),
          );
          continue;
        }
        if (parsed.value.length === 0) {
          // Empty list key — starts a list section
          activeList = `capability_required.${parsed.key}`;
          continue;
        }
        // Inline value like "[]" → empty list
        if (parsed.value === "[]") continue;
        issues.push(
          issue(
            "plugin_manifest.missing_field",
            `PluginManifest capability_required.${parsed.key} must be a list at line ${lineNumber}.`,
            path,
          ),
        );
        continue;
      }

      if (parsed.value.length === 0) {
        issues.push(
          issue(
            "plugin_manifest.missing_field",
            `PluginManifest '${activeTopLevel}.${parsed.key}' requires a scalar value at line ${lineNumber}.`,
            path,
          ),
        );
        continue;
      }
      const scalar = parseScalar(parsed.value, lineNumber, path);
      if (!scalar.ok) {
        issues.push(scalar.issue);
        continue;
      }
      assignNestedScalar(
        activeTopLevel,
        parsed.key,
        scalar.value,
        capability,
        artifactStaging,
        lineNumber,
        path,
        issues,
      );
      continue;
    }

    // Handle list items at indent 4
    const isCapRequiredList = activeList?.startsWith("capability_required.");
    const isArgvRequired =
      activeTopLevel === "argv_schema" && activeList === "argv_schema.required";

    if (!isArgvRequired && !isCapRequiredList) {
      issues.push(
        issue(
          "yaml.unsupported_indentation",
          `Unsupported PluginManifest nesting at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }
    const item = raw.match(/^ {4}-(?:\s+(.*)|\s*)$/);
    if (!item?.[1]?.trim()) {
      const listName = isArgvRequired ? "argv_schema.required" : activeList;
      issues.push(
        issue(
          "plugin_manifest.argv_required_missing",
          `PluginManifest ${listName} item is missing at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }
    const scalar = parseScalar(item[1].trim(), lineNumber, path);
    if (!scalar.ok) {
      issues.push(scalar.issue);
      continue;
    }
    if (isArgvRequired) argvRequired.push(scalar.value);
  }

  for (const key of REQUIRED_TOP_LEVEL) {
    if (!topLevelSeen.has(key)) {
      issues.push(
        issue(
          "plugin_manifest.missing_field",
          `PluginManifest is missing required field '${key}'.`,
          path,
        ),
      );
    }
  }
  for (const key of REQUIRED_CAPABILITY) {
    if (!capability[key as keyof PluginManifestContract["capability"]]) {
      issues.push(
        issue(
          "plugin_manifest.missing_field",
          `PluginManifest is missing required field 'capability.${key}'.`,
          path,
        ),
      );
    }
  }
  if (!nestedSeen.get("argv_schema")?.has("required") || argvRequired.length === 0) {
    issues.push(
      issue(
        "plugin_manifest.argv_required_missing",
        "PluginManifest argv_schema.required must contain at least one item.",
        path,
      ),
    );
  }
  const capReqSeen = nestedSeen.get("capability_required");
  if (!capReqSeen) {
    issues.push(
      issue(
        "plugin_manifest.missing_field",
        "PluginManifest is missing required field 'capability_required'.",
        path,
      ),
    );
  } else {
    for (const key of ["fs_read", "fs_write", "net", "secret_refs"]) {
      if (!capReqSeen.has(key)) {
        issues.push(
          issue(
            "plugin_manifest.missing_field",
            `PluginManifest capability_required is missing field '${key}'.`,
            path,
          ),
        );
      }
    }
  }
  for (const key of REQUIRED_ARTIFACT_STAGING) {
    if (!artifactStaging[key as keyof PluginManifestContract["artifactStaging"]]) {
      issues.push(
        issue(
          "plugin_manifest.missing_field",
          `PluginManifest is missing required field 'artifact_staging.${key}'.`,
          path,
        ),
      );
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: {
      id: values.id,
      schemaRef: values.schema_ref,
      packageRoot: values.package_root,
      capability: {
        kind: capability.kind ?? "",
        network: capability.network ?? "",
        secrets: capability.secrets ?? "",
        isolation: capability.isolation,
      },
      argvRequired,
      outputSchema: values.output_schema,
      timeoutMs: values.timeout_ms,
      artifactStaging: {
        enabled: artifactStaging.enabled ?? "",
        root: artifactStaging.root ?? "",
      },
    },
    issues: [],
  };
}

function parseKeyValue(line: string, lineNumber: number, path: string): ParsedKeyValue {
  const separator = line.indexOf(":");
  if (separator === -1) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_indentation",
        `Malformed PluginManifest row at line ${lineNumber}.`,
        path,
      ),
    };
  }
  const key = line.slice(0, separator).trim();
  if (!KEY_PATTERN.test(key)) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_indentation",
        `Invalid PluginManifest key at line ${lineNumber}.`,
        path,
      ),
    };
  }
  return { ok: true, key, value: line.slice(separator + 1).trim() };
}

function parseScalar(value: string, lineNumber: number, path: string): ParsedScalar {
  if (/^[|>]/.test(value)) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_block_scalar",
        `Block scalar is unsupported at line ${lineNumber}.`,
        path,
      ),
    };
  }
  if (value.startsWith("#") || /\s#/.test(value)) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_inline_comment",
        `Inline comments are unsupported at line ${lineNumber}.`,
        path,
      ),
    };
  }
  if (/^[[{&*!]/.test(value) || hasUnquotedInlineMapping(value)) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_indentation",
        `Unsupported PluginManifest scalar syntax at line ${lineNumber}.`,
        path,
      ),
    };
  }

  const startsWithQuote = value.startsWith('"') || value.startsWith("'");
  const endsWithQuote = value.endsWith('"') || value.endsWith("'");
  if (!startsWithQuote && !endsWithQuote) return { ok: true, value };
  const quote = value[0];
  if ((quote !== '"' && quote !== "'") || value.length < 2 || !value.endsWith(quote)) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_indentation",
        `Malformed PluginManifest scalar at line ${lineNumber}.`,
        path,
      ),
    };
  }
  return { ok: true, value: value.slice(1, -1) };
}

function hasUnquotedInlineMapping(value: string): boolean {
  return /:\s/.test(value);
}

function addKey(
  seen: Set<string>,
  key: string,
  lineNumber: number,
  path: string,
  issues: AiCoreIssue[],
): boolean {
  if (!seen.has(key)) {
    seen.add(key);
    return true;
  }
  issues.push(
    issue(
      "plugin_manifest.duplicate_key",
      `Duplicate PluginManifest key '${key}' at line ${lineNumber}.`,
      path,
    ),
  );
  return false;
}

function addNestedKey(
  seen: Map<string, Set<string>>,
  section: string,
  key: string,
  lineNumber: number,
  path: string,
  issues: AiCoreIssue[],
): boolean {
  const sectionSeen = seen.get(section) ?? new Set<string>();
  seen.set(section, sectionSeen);
  return addKey(sectionSeen, key, lineNumber, path, issues);
}

function assignNestedScalar(
  section: string,
  key: string,
  value: string,
  capability: Partial<PluginManifestContract["capability"]>,
  artifactStaging: Partial<PluginManifestContract["artifactStaging"]>,
  lineNumber: number,
  path: string,
  issues: AiCoreIssue[],
): void {
  if (section === "capability") {
    if (!ALLOWED_CAPABILITY.has(key)) {
      issues.push(
        issue(
          "plugin_manifest.missing_field",
          `Unknown PluginManifest capability field '${key}' at line ${lineNumber}.`,
          path,
        ),
      );
      return;
    }
    capability[key as keyof PluginManifestContract["capability"]] = value;
    return;
  }
  if (section === "artifact_staging") {
    if (!REQUIRED_ARTIFACT_STAGING.includes(key)) {
      issues.push(
        issue(
          "plugin_manifest.missing_field",
          `Unknown PluginManifest artifact_staging field '${key}' at line ${lineNumber}.`,
          path,
        ),
      );
      return;
    }
    artifactStaging[key as keyof PluginManifestContract["artifactStaging"]] = value;
    return;
  }
  issues.push(
    issue(
      "plugin_manifest.missing_field",
      `Unknown PluginManifest nested section '${section}' at line ${lineNumber}.`,
      path,
    ),
  );
}

function issue(code: PluginManifestIssueCode, message: string, path: string): AiCoreIssue {
  return { code, severity: "error", message, path };
}
