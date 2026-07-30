import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCasesYaml } from "../../../runtime/cases/parse.ts";
import { inspectAutomationCoverage } from "./automation-contract.ts";

export interface GeneratedAutomationScripts {
  created: string[];
  skipped: string[];
  unmapped: string[];
  orphanScripts: string[];
}

function caseYaml(featureDir: string): string {
  const dir = join(featureDir, "cases");
  const files = existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith(".yaml")) : [];
  if (files.length !== 1) throw new Error(`cases/ 下 yaml 必须唯一，当前为 ${files.length}`);
  return join(dir, files[0]);
}

export function generateAutomationScripts(
  featureDir: string,
  opts: { apply?: boolean } = {},
): GeneratedAutomationScripts {
  const yaml = parseCasesYaml(readFileSync(caseYaml(featureDir), "utf8"));
  const coverage = inspectAutomationCoverage(featureDir);
  const missing = new Set(
    coverage.missingScript.map((value) => value.slice(value.indexOf(":") + 1)),
  );
  const result: GeneratedAutomationScripts = {
    created: [],
    skipped: [],
    unmapped: [],
    orphanScripts: coverage.orphanScripts,
  };

  for (const item of yaml.cases) {
    const specFile = item.automation?.spec_file;
    if (!specFile) {
      result.unmapped.push(item.id);
      continue;
    }
    if (missing.has(specFile)) {
      result.unmapped.push(`${item.id}:${specFile}`);
      continue;
    }
    result.skipped.push(specFile);
  }

  if (opts.apply && result.unmapped.length > 0) {
    throw new Error(
      `拒绝生成通用占位脚本；以下用例必须由真实业务实现后登记: ${result.unmapped.join(", ")}`,
    );
  }

  return result;
}
