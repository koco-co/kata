import { describe, expect, it } from "bun:test";
import { auditAiCoreParserBoundaries } from "../../src/ai-core/parser-boundary-audit.ts";

describe("AI Core parser boundary audit", () => {
  it("passes committed AI Core parser boundaries", () => {
    const result = auditAiCoreParserBoundaries();

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("flags ad hoc regex YAML readers outside approved parser modules", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-command-loader.ts",
          text: `
function parseCommandYaml(text: string): { id?: string } {
  return {
    id: text.match(/^id:\\s*([^\\s#]+)/m)?.[1],
  };
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-command-loader.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags top-level YAML scalar regex readers even when the declaration does not mention YAML", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-loader.ts",
          text: `
function readTopLevelId(text: string): string | undefined {
  return text.match(/^id:\\s*([^\\s#]+)/m)?.[1];
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-loader.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags manifest hash YAML scalar regex readers outside approved parser modules", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-vendor.ts",
          text: `
function readVendorDigest(text: string): string | undefined {
  return text.match(/^manifest_hash:\\s*(.+)$/m)?.[1];
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-vendor.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags YAML regex variables passed to match outside approved parser modules", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-command-loader.ts",
          text: `
function readTopLevelId(text: string): string | undefined {
  const idPattern = /^id:\\s*([^\\s#]+)/m;
  return text.match(idPattern)?.[1];
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-command-loader.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags dynamic YAML regex variables passed to match outside approved parser modules", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-command-loader.ts",
          text: `
function readTopLevelId(text: string): string | undefined {
  const idPattern = new RegExp("^id:\\\\s*([^\\\\s#]+)", "m");
  return text.match(idPattern)?.[1];
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-command-loader.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags dynamic YAML regex variables passed to exec outside approved parser modules", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-command-loader.ts",
          text: `
function readTopLevelId(text: string): string | undefined {
  const idPattern = new RegExp("^id:\\\\s*([^\\\\s#]+)", "m");
  return idPattern.exec(text)?.[1];
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-command-loader.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags YAML regex variables passed to exec with simple expression arguments", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-command-loader.ts",
          text: `
function readTopLevelId(text: string): string | undefined {
  const idPattern = /^id:\\s*([^\\s#]+)/m;
  return idPattern.exec(text.trim())?.[1];
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-command-loader.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags manual key-value YAML readers split by string newline", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-import-runtime.ts",
          text: `
function parseRuntimeImportRecord(content: string): Record<string, string> {
  const record: Record<string, string> = {};
  for (const raw of content.split("\\n")) {
    const line = raw.trim();
    if (!line.includes(":")) continue;
    const index = line.indexOf(":");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    record[key] = value;
  }
  return record;
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-import-runtime.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags manual key-value YAML readers split by newline regex", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-import-runtime.ts",
          text: `
function parseRuntimeImportRecord(content: string): Record<string, string> {
  const record: Record<string, string> = {};
  for (const raw of content.split(/\\n/)) {
    const line = raw.trim();
    if (!line.includes(":")) continue;
    const index = line.indexOf(":");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    record[key] = value;
  }
  return record;
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-import-runtime.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags YAML regex exec readers outside approved parser modules", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-command-loader.ts",
          text: `
function readTopLevelId(text: string): string | undefined {
  const match = /^id:\\s*([^\\s#]+)/m.exec(text);
  return match?.[1];
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-command-loader.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags YAML regex literal exec readers with simple expression arguments", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-command-loader.ts",
          text: `
function readTopLevelId(text: string): string | undefined {
  return /^id:\\s*([^\\s#]+)/m.exec(text.trim())?.[1];
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-command-loader.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags manual line-splitting readers that use YAML-shaped line regexes", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-workflow-steps.ts",
          text: `
function readWorkflowStepIds(text: string): string[] {
  const ids: string[] = [];
  let inStep = false;
  for (const raw of text.split(/\\r?\\n/)) {
    if (/^  -\\s*/.test(raw)) {
      inStep = true;
      continue;
    }
    if (inStep && /^    id:\\s*/.test(raw)) ids.push(raw.replace(/^    id:\\s*/, ""));
  }
  return ids;
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-workflow-steps.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags YAML-shaped dynamic regex readers outside approved parser modules", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-command-loader.ts",
          text: `
function parseCommandYaml(text: string): { id?: string } {
  return {
    id: text.match(new RegExp("^id:\\\\s*([^\\\\s#]+)", "m"))?.[1],
  };
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-command-loader.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags dynamic YAML regex exec readers with simple expression arguments", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-command-loader.ts",
          text: `
function parseCommandYaml(text: string): { id?: string } {
  return {
    id: new RegExp("^id:\\\\s*([^\\\\s#]+)", "m").exec(text.trim())?.[1],
  };
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-command-loader.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags manual key-value YAML readers even when the declaration does not mention YAML", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-import-runtime.ts",
          text: `
function parseRuntimeImportRecord(content: string): Record<string, string> {
  const record: Record<string, string> = {};
  for (const raw of content.split(/\\r?\\n/)) {
    const line = raw.trim();
    if (line.length === 0 || line.startsWith("#") || line.startsWith("- ") || !line.includes(":")) continue;
    const index = line.indexOf(":");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    record[key] = value;
  }
  return record;
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-import-runtime.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags manual list-row YAML readers even when the declaration does not mention YAML", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-lint.ts",
          text: `
function parseRuntimeRootRows(content: string): Array<Record<string, string>> {
  const rows: Array<Record<string, string>> = [];
  let current: Record<string, string> | undefined;
  for (const raw of content.split(/\\r?\\n/)) {
    const line = raw.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    if (line.startsWith("- ")) {
      if (current) rows.push(current);
      current = {};
      assignRuntimeRootValue(current, line.slice(2));
      continue;
    }
    if (current) assignRuntimeRootValue(current, line);
  }
  if (current) rows.push(current);
  return rows;
}

function assignRuntimeRootValue(row: Record<string, string>, pair: string): void {
  const index = pair.indexOf(":");
  if (index === -1) return;
  row[pair.slice(0, index).trim()] = pair.slice(index + 1).trim();
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/fixture-lint.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("does not skip nested files with approved parser basenames", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/nested/yaml-contract.ts",
          text: `
function parseCommandYaml(text: string): { id?: string } {
  return {
    id: text.match(/^id:\\s*([^\\s#]+)/m)?.[1],
  };
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/nested/yaml-contract.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("only allows exact transitional import-runtime ad hoc YAML reader exception path", () => {
    const text = `
function parseRuntimeImportRecord(content: string): Record<string, string> {
  const record: Record<string, string> = {};
  for (const raw of content.split(/\\r?\\n/)) {
    const line = raw.trim();
    if (!line.includes(":")) continue;
    const index = line.indexOf(":");
    record[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return record;
}
`;

    expect(
      auditAiCoreParserBoundaries({
        files: [{ path: "engine/src/ai-core/import-runtime.ts", text }],
      }).ok,
    ).toBe(true);

    const nested = auditAiCoreParserBoundaries({
      files: [{ path: "engine/src/ai-core/nested/import-runtime.ts", text }],
    });

    expect(nested.ok).toBe(false);
    expect(nested.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/nested/import-runtime.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("only allows exact transitional lint parseRuntimeRootRows YAML reader exception", () => {
    const text = `
function parseRuntimeRootRows(content: string): AiCoreRuntimeRoot[] {
  const rows: Array<Record<string, string>> = [];
  let current: Record<string, string> | undefined;
  for (const raw of content.split(/\\r?\\n/)) {
    const line = raw.trim();
    if (line.startsWith("- ")) {
      if (current) rows.push(current);
      current = {};
      assignRuntimeRootValue(current, line.slice(2));
      continue;
    }
    if (current) assignRuntimeRootValue(current, line);
  }
  if (current) rows.push(current);
  return rows as AiCoreRuntimeRoot[];
}

function assignRuntimeRootValue(row: Record<string, string>, pair: string): void {
  const index = pair.indexOf(":");
  if (index === -1) return;
  row[pair.slice(0, index).trim()] = pair.slice(index + 1).trim();
}
`;

    expect(
      auditAiCoreParserBoundaries({
        files: [{ path: "engine/src/ai-core/lint.ts", text }],
      }).ok,
    ).toBe(true);

    const sibling = auditAiCoreParserBoundaries({
      files: [{ path: "engine/src/ai-core/lint-copy.ts", text }],
    });

    expect(sibling.ok).toBe(false);
    expect(sibling.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/lint-copy.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });

    const extraReader = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/lint.ts",
          text: `${text}
function readRuntimeRootKind(text: string): string | undefined {
  return text.match(/^kind:\\s*([^\\s#]+)/m)?.[1];
}
`,
        },
      ],
    });

    expect(extraReader.ok).toBe(false);
    expect(extraReader.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/lint.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("only allows exact transitional load ad hoc YAML reader exception path", () => {
    const text = `
function readTopLevelId(text: string): string | undefined {
  return text.match(/^id:\\s*([^\\s#]+)/m)?.[1];
}
`;

    expect(
      auditAiCoreParserBoundaries({
        files: [{ path: "engine/src/ai-core/load.ts", text }],
      }).ok,
    ).toBe(true);

    const sibling = auditAiCoreParserBoundaries({
      files: [{ path: "engine/src/ai-core/load-copy.ts", text }],
    });

    expect(sibling.ok).toBe(false);
    expect(sibling.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/load-copy.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("only allows exact transitional vendor ad hoc YAML reader exception path", () => {
    const text = `
function readExternalManifestHash(content: string): string | undefined {
  return content.match(/^\\s+manifest_hash:\\s+sha256:([a-f0-9]{64})$/m)?.[1];
}
`;

    expect(
      auditAiCoreParserBoundaries({
        files: [{ path: "engine/src/ai-core/vendor.ts", text }],
      }).ok,
    ).toBe(true);

    const sibling = auditAiCoreParserBoundaries({
      files: [{ path: "engine/src/ai-core/vendor-copy.ts", text }],
    });

    expect(sibling.ok).toBe(false);
    expect(sibling.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/vendor-copy.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("only allows exact transitional validate ad hoc YAML reader exception path", () => {
    const text = `
function parseWorkflowSteps(text: string): WorkflowStep[] {
  const steps: Array<{ id?: string }> = [];
  let currentStep: { id?: string } | undefined;
  for (const raw of text.split(/\\r?\\n/)) {
    const itemMatch = raw.match(/^  -\\s*(.*)$/);
    if (itemMatch) {
      if (currentStep) steps.push(currentStep);
      currentStep = {};
      const inlineId = itemMatch[1].match(/^id:\\s*(.+?)\\s*$/);
      if (inlineId) currentStep.id = inlineId[1];
      continue;
    }
    if (!currentStep) continue;
    const nestedId = raw.match(/^    id:\\s*(.+?)\\s*$/);
    if (nestedId) currentStep.id = nestedId[1];
  }
  if (currentStep) steps.push(currentStep);
  return steps;
}
`;

    expect(
      auditAiCoreParserBoundaries({
        files: [{ path: "engine/src/ai-core/validate.ts", text }],
      }).ok,
    ).toBe(true);

    const sibling = auditAiCoreParserBoundaries({
      files: [{ path: "engine/src/ai-core/validate-copy.ts", text }],
    });

    expect(sibling.ok).toBe(false);
    expect(sibling.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/validate-copy.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("only allows exact transitional evals normalizeGoldenRows YAML reader exception", () => {
    const text = `
function normalizeGoldenRows(text: string, path: string): GoldenNormalizeResult {
  const normalized: string[] = [];
  for (const raw of text.split(/\\r?\\n/)) {
    const line = raw.trim();
    if (!line.includes(":")) continue;
    const index = line.indexOf(":");
    normalized.push(line.slice(0, index).trim() + ": " + line.slice(index + 1).trim());
  }
  return { ok: true, normalized: normalized.join("\\n"), issues: [] };
}
`;

    expect(
      auditAiCoreParserBoundaries({
        files: [{ path: "engine/src/ai-core/evals.ts", text }],
      }).ok,
    ).toBe(true);

    const sibling = auditAiCoreParserBoundaries({
      files: [{ path: "engine/src/ai-core/evals-copy.ts", text }],
    });

    expect(sibling.ok).toBe(false);
    expect(sibling.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/evals-copy.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });

    const extraReader = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/evals.ts",
          text: `${text}
function readGoldenKind(text: string): string | undefined {
  return text.match(/^kind:\\s*([^\\s#]+)/m)?.[1];
}
`,
        },
      ],
    });

    expect(extraReader.ok).toBe(false);
    expect(extraReader.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/evals.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("only allows exact transitional evals ad hoc YAML reader exception path", () => {
    const text = `
function readSkillRouting(text: string): { skillId?: string; aliases: string[] } {
  return {
    skillId: text.match(/^id:\\s*([^\\s#]+)/m)?.[1],
    aliases: [...text.matchAll(/^\\s{2}- name:\\s*([A-Za-z0-9:_-]+)\\s*$/gm)].map(match => match[1]),
  };
}
`;

    expect(
      auditAiCoreParserBoundaries({
        files: [{ path: "engine/src/ai-core/evals.ts", text }],
      }).ok,
    ).toBe(true);

    const sibling = auditAiCoreParserBoundaries({
      files: [{ path: "engine/src/ai-core/evals-copy.ts", text }],
    });

    expect(sibling.ok).toBe(false);
    expect(sibling.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/evals-copy.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("flags new ad hoc YAML readers in an exact transitional exception path", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/load.ts",
          text: `
function readTopLevelId(path: string): string {
  const text = readFileSync(path, "utf8");
  const match = text.match(/^id:\\s*([^\\s#]+)/m);
  if (!match) throw new Error("Missing id");
  return match[1];
}

function readTopLevelKind(text: string): string | undefined {
  return text.match(/^kind:\\s*([^\\s#]+)/m)?.[1];
}
`,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      code: "parser_boundary.ad_hoc_yaml_reader",
      severity: "error",
      path: "engine/src/ai-core/load.ts",
      message: "Ad hoc YAML parsing must stay behind approved AI Core parser modules.",
    });
  });

  it("allows unrelated dynamic regex matching outside YAML parser code", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-doc-renderer.ts",
          text: `
function parseCommandYaml(text: string, marker: string): number[] {
  const markerPattern = new RegExp(marker, "g");
  return [...text.matchAll(markerPattern)].map(match => match.index ?? 0);
}
`,
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("allows unrelated dynamic regex exec readers with simple expression arguments", () => {
    const result = auditAiCoreParserBoundaries({
      files: [
        {
          path: "engine/src/ai-core/fixture-doc-renderer.ts",
          text: `
function readMarkerIndex(text: string): number | undefined {
  return new RegExp("^marker-(\\\\d+)$", "m").exec(text.trim())?.index;
}
`,
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
