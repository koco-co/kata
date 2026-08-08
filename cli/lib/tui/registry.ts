import { readFileSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { findCasesYaml } from "../../commands/cases-build.ts";
import { runFeaturesShow } from "../../commands/features.ts";
import { parseCasesYaml } from "../cases/parse.ts";
import { projectRootFromFeatureDir } from "../features-layout.ts";
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

export function existingAutomationEnv(ref: FeatureRef): string {
  try {
    const { yamlPath } = findCasesYaml(ref.featureDir);
    const file = parseCasesYaml(readFileSync(yamlPath, "utf8"));
    return file.meta.automation_env ?? "";
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
  const sections = [
    buildSection("Created", report.created),
    buildSection("Updated", report.updated),
    buildSection("Unchanged", report.unchanged),
    buildSection("Deleted", report.deleted),
  ].filter((section): section is string => Boolean(section));
  return ["Build complete", ...sections].join("\n\n");
}

function buildSection(label: string, paths: readonly string[]): string | undefined {
  if (paths.length === 0) return undefined;
  return `${label}:\n${formatPaths(paths)}`;
}

function formatPaths(paths: readonly string[]): string {
  return paths.map((path) => `  ${formatPath(path)}`).join("\n");
}

function formatPath(path: string): string {
  const resolvedPath = resolve(path);
  const featureDir = resolve(dirname(resolvedPath), "..", "..");
  try {
    projectRootFromFeatureDir(featureDir);
    return relative(featureDir, resolvedPath).split("\\").join("/") || path;
  } catch {
    return basename(resolvedPath);
  }
}
