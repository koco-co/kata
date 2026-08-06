import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { findCasesYaml } from "../../commands/cases-build.ts";
import { runFeaturesShow } from "../../commands/features.ts";
import { parseCasesYaml } from "../cases/parse.ts";
import type { FeatureRef } from "./types.ts";

export function featureRefByProjectPath(
  project: string,
  relativePath: string,
): FeatureRef | undefined {
  const result = runFeaturesShow({ project, featurePath: relativePath });
  return {
    project,
    relativePath,
    featureDir: result.dir,
    featureKey: result.feature_key,
    title: result.title,
    version: result.version,
    module: result.module,
    ...(result.requirement_id ? { requirementId: result.requirement_id } : {}),
    ...(result.customer ? { customer: result.customer } : {}),
  };
}

export function existingCaseModuleId(ref: FeatureRef): string {
  try {
    const { yamlPath } = findCasesYaml(ref.featureDir);
    const file = parseCasesYaml(readFileSync(yamlPath, "utf8"));
    return file.meta.case_module_id;
  } catch {
    return "";
  }
}

export function formatBuildReport(report: {
  created: string[];
  updated: string[];
  unchanged: string[];
  deleted: string[];
}): string {
  return [
    "构建完成",
    `created:\n${formatPaths(report.created)}`,
    `updated:\n${formatPaths(report.updated)}`,
    `unchanged:\n${formatPaths(report.unchanged)}`,
    `deleted:\n${formatPaths(report.deleted)}`,
  ].join("\n\n");
}

function formatPaths(paths: readonly string[]): string {
  if (paths.length === 0) return "(无)";
  return paths.map((path) => relative(process.cwd(), path) || path).join("\n");
}
