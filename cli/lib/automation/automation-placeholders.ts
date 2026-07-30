import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "../atomic-writer.ts";
import { generateAutomationRunner, inspectAutomationCoverage } from "./automation-contract.ts";

export interface PlaceholderMigrationReport {
  readonly featureDir: string;
  readonly yamlPath: string;
  readonly placeholderScripts: string[];
  readonly removedMappings: string[];
  readonly applied: boolean;
  readonly runner?: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isGeneratedPlaceholder(path: string): boolean {
  if (!existsSync(path)) return false;
  const source = readFileSync(path, "utf8");
  return (
    source.includes("runGeneratedCase") ||
    source.includes("Generated from the canonical cases YAML")
  );
}

function removeMapping(yaml: string, specFile: string): string {
  const pattern = new RegExp(
    `(^|\\r?\\n)([ \\t]+)automation:\\r?\\n\\2  spec_file:\\s*${escapeRegExp(specFile)}\\r?(?=\\n|$)`,
    "g",
  );
  const next = yaml.replace(pattern, "$1");
  if (next === yaml) throw new Error(`未找到占位脚本对应的 automation.spec_file: ${specFile}`);
  return next;
}

export function migrateGeneratedPlaceholders(
  featureDir: string,
  options: { readonly apply?: boolean } = {},
): PlaceholderMigrationReport {
  const coverage = inspectAutomationCoverage(featureDir);
  const casesDir = join(featureDir, "automation", "tests", "cases");
  const placeholderScripts = coverage.cases
    .filter((item) => item.specFile && isGeneratedPlaceholder(join(casesDir, item.specFile)))
    .map((item) => item.specFile as string);
  let yaml = readFileSync(coverage.yamlPath, "utf8");
  for (const specFile of placeholderScripts) yaml = removeMapping(yaml, specFile);

  if (options.apply) {
    for (const specFile of placeholderScripts) unlinkSync(join(casesDir, specFile));
    if (placeholderScripts.length > 0) writeFileAtomic(coverage.yamlPath, yaml);
    const runner = generateAutomationRunner(featureDir, { apply: true });
    return {
      featureDir,
      yamlPath: coverage.yamlPath,
      placeholderScripts,
      removedMappings: placeholderScripts,
      applied: true,
      runner: runner.path,
    };
  }

  return {
    featureDir,
    yamlPath: coverage.yamlPath,
    placeholderScripts,
    removedMappings: placeholderScripts,
    applied: false,
  };
}
