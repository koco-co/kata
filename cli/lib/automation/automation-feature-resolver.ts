import fs from "node:fs";
import path from "node:path";
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
