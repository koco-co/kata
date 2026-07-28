import fs from "node:fs";
import path from "node:path";
import { parseCasesYaml } from "./cases/parse.ts";
import { projectRootFromFeatureDir, resolveFeatureEntry } from "./features-layout.ts";
import { locateProject } from "./workspace-locator.ts";

export interface ResolvedAutomationFeature {
  readonly dir: string;
  readonly dirName: string;
  readonly requirementId?: string;
}

function listCaseYamls(featuresDir: string): string[] {
  if (!fs.existsSync(featuresDir)) return [];
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "cases") {
          for (const file of fs.readdirSync(absolute)) {
            if (file.endsWith(".yaml")) files.push(path.join(absolute, file));
          }
        } else {
          walk(absolute);
        }
      }
    }
  };
  walk(featuresDir);
  return files.sort();
}

function readPrdRequirementId(featureDir: string): string | undefined {
  const prdPath = path.join(featureDir, "prd.md");
  if (!fs.existsSync(prdPath)) return undefined;
  const text = fs.readFileSync(prdPath, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return undefined;
  const value = match[1].match(/^requirement_id:\s*["']?([^"'\s]+)["']?/m)?.[1];
  return value && /^\d+$/.test(value) ? value : undefined;
}

function loadRequirementIndex(featuresDir: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const yamlPath of listCaseYamls(featuresDir)) {
    const featureDir = path.dirname(path.dirname(yamlPath));
    const file = parseCasesYaml(fs.readFileSync(yamlPath, "utf8"));
    const prdId = readPrdRequirementId(featureDir);
    const requirementId = file.meta.requirement_id;
    if (prdId && !requirementId) {
      throw new Error(`cases YAML 缺少 meta.requirement_id: ${yamlPath}`);
    }
    if (prdId && requirementId !== prdId) {
      throw new Error(`cases YAML 与 prd.md.requirement_id 不一致: ${yamlPath}`);
    }
    if (!requirementId) continue;
    const previous = result.get(requirementId);
    if (previous && path.resolve(previous) !== path.resolve(featureDir)) {
      throw new Error(`requirement_id 重复: ${requirementId}\n  - ${previous}\n  - ${featureDir}`);
    }
    result.set(requirementId, featureDir);
  }
  return result;
}

export function resolveAutomationFeature(
  selector: string,
  project: string,
  repoRoot?: string,
  options: { requirementIdMapping?: boolean } = {},
): ResolvedAutomationFeature {
  const paths = locateProject(project, repoRoot);
  const candidate = path.resolve(selector);
  if (fs.existsSync(candidate)) {
    const projectRoot = projectRootFromFeatureDir(candidate);
    if (path.resolve(projectRoot) !== path.resolve(paths.projectDir)) {
      throw new Error(`feature-dir 不属于项目 ${project}: ${candidate}`);
    }
    return { dir: candidate, dirName: path.basename(candidate) };
  }
  if (/^\d+$/.test(selector)) {
    if (options.requirementIdMapping === false) {
      throw new Error(
        "requirement_id 自动发现已关闭；请传完整 feature 路径或开启 playwright.requirement_id_mapping",
      );
    }
    const mapped = loadRequirementIndex(paths.featuresDir).get(selector);
    if (!mapped) throw new Error(`未找到 requirement_id 映射: ${selector}`);
    return { dir: mapped, dirName: path.basename(mapped), requirementId: selector };
  }
  const entry = resolveFeatureEntry(paths.featuresDir, selector);
  return { dir: entry.dir, dirName: entry.dirName };
}
