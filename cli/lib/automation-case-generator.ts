import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { writeFileAtomic } from "./atomic-writer.ts";
import { generateAutomationRunner, inspectAutomationCoverage } from "./automation-contract.ts";
import { parseCasesYaml } from "./cases/parse.ts";
import type { CaseItem } from "./cases/types.ts";
import { projectRootFromFeatureDir } from "./features-layout.ts";

export interface GeneratedAutomationScripts {
  created: string[];
  skipped: string[];
  orphanScripts: string[];
  runner?: string;
}

function caseYaml(featureDir: string): string {
  const dir = join(featureDir, "cases");
  const files = existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith(".yaml")) : [];
  if (files.length !== 1) throw new Error(`cases/ 下 yaml 必须唯一，当前为 ${files.length}`);
  return join(dir, files[0]);
}

function runtimeSafeText(value: string): string {
  return value
    .replace(/https?:\/\/[^\s，。；)）]+/gi, String.raw`\${KATA_CASE_URL}`)
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, String.raw`\${KATA_CASE_HOST}`);
}

function renderScript(featureDir: string, item: CaseItem): string {
  const casesDir = join(featureDir, "automation", "tests", "cases");
  const sharedRunner = join(
    projectRootFromFeatureDir(featureDir),
    "_shared",
    "helpers",
    "case-runner",
  );
  let importPath = relative(casesDir, sharedRunner).split(sep).join("/");
  if (!importPath.startsWith(".")) importPath = `./${importPath}`;
  const definition = {
    id: item.id,
    title: runtimeSafeText(item.title),
    steps: item.steps.map((step) => ({
      action: runtimeSafeText(step.action),
      expected: runtimeSafeText(step.expected),
    })),
  };
  return `// Generated from the canonical cases YAML; keep business steps in the YAML source.\nimport { test } from "@playwright/test";\nimport { runGeneratedCase } from "${importPath}";\n\nconst CASE = ${JSON.stringify(definition, null, 2)} as const;\n\ntest.describe(${JSON.stringify(item.title)}, () => {\n  test(${JSON.stringify(`${item.id} ${item.title}`)}, async ({ page }) => {\n    await runGeneratedCase(page, CASE);\n  });\n});\n`;
}

export function generateAutomationScripts(
  featureDir: string,
  opts: { apply?: boolean; runner?: boolean } = {},
): GeneratedAutomationScripts {
  const yaml = parseCasesYaml(readFileSync(caseYaml(featureDir), "utf8"));
  const coverage = inspectAutomationCoverage(featureDir);
  const casesDir = join(featureDir, "automation", "tests", "cases");
  const missing = new Set(
    coverage.missingScript.map((value) => value.slice(value.indexOf(":") + 1)),
  );
  const result: GeneratedAutomationScripts = {
    created: [],
    skipped: [],
    orphanScripts: coverage.orphanScripts,
  };

  for (const item of yaml.cases) {
    const specFile = item.automation?.spec_file;
    if (!specFile || !missing.has(specFile)) continue;
    const path = join(casesDir, specFile);
    if (opts.apply) writeFileAtomic(path, renderScript(featureDir, item));
    result.created.push(path);
  }
  for (const item of yaml.cases) {
    const specFile = item.automation?.spec_file;
    if (specFile && !missing.has(specFile)) result.skipped.push(specFile);
  }

  if (opts.apply && opts.runner !== false && result.created.length > 0) {
    result.runner = generateAutomationRunner(featureDir, { apply: true }).path;
  }
  return result;
}
