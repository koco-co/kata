import fs from "node:fs";
import path, { basename } from "node:path";
import { locateFeaturesByRequirementId } from "../cases/requirement-locate.ts";
import {
  featureRelativePath,
  projectRootFromFeatureDir,
  resolveFeatureEntry,
} from "../features-layout.ts";
import { locateProject } from "../workspace-locator.ts";

export interface ResolvedAutomationFeature {
  readonly dir: string;
  readonly dirName: string;
  readonly relativePath: string;
}

export interface ResolvedAutomationRunTarget extends ResolvedAutomationFeature {
  readonly project: string;
}

/** Resolve only an absolute feature directory or its full path below features/. */
export function resolveAutomationFeature(
  selector: string,
  project: string,
  repoRoot?: string,
): ResolvedAutomationFeature {
  const paths = locateProject(project, repoRoot);
  const candidate = path.resolve(selector);
  const featurePath = fs.existsSync(candidate)
    ? (() => {
        const projectRoot = projectRootFromFeatureDir(candidate);
        if (path.resolve(projectRoot) !== path.resolve(paths.projectDir)) {
          throw new Error(`feature-dir 不属于项目 ${project}: ${candidate}`);
        }
        return path.relative(paths.featuresDir, candidate).split("\\").join("/");
      })()
    : selector;
  const entry = resolveFeatureEntry(paths.featuresDir, featurePath);
  return {
    dir: entry.dir,
    dirName: entry.dirName,
    relativePath: featureRelativePath(paths.featuresDir, entry),
  };
}

/** Resolve a run target from a feature path or a numeric requirement id. */
export function resolveAutomationRunTarget(
  selector: string,
  project?: string,
  repoRoot?: string,
): ResolvedAutomationRunTarget {
  if (/^\d+$/.test(selector)) {
    const matches = locateFeaturesByRequirementId(selector, project ? { project } : {});
    if (matches.length === 0) throw new Error(`需求 ID 未匹配到 feature: ${selector}`);
    if (matches.length > 1) {
      throw new Error(`需求 ID ${selector} 匹配到多个 feature，请用 --project 指定项目`);
    }
    const match = matches[0];
    return {
      project: match.project,
      dir: match.featureDir,
      dirName: basename(match.featureDir),
      relativePath: match.relativePath,
    };
  }
  if (!project) {
    throw new Error("kata automation run requires --project or KATA_ACTIVE_PROJECT");
  }
  const feature = resolveAutomationFeature(selector, project, repoRoot);
  return { project, ...feature };
}
