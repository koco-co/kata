/**
 * `kata cases build` — render cases/需求名.xmind and cases/exports/需求名.md
 * from the canonical cases/需求名.yaml. Zero-case or invalid yaml exits non-zero.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Command } from "commander";
import { writeFileAtomic } from "../lib/atomic-writer.ts";
import { parseCasesYaml, validateCases } from "../lib/cases/parse.ts";
import { renderMarkdown } from "../lib/cases/render-md.ts";
import { renderXmind } from "../lib/cases/render-xmind.ts";
import { assertWritable } from "../lib/path-policy.ts";
import type { ProjectPaths } from "../lib/types.ts";

// 写入边界:只允许写在 feature 目录内
function featurePaths(featureDir: string): ProjectPaths {
  const d = resolve(featureDir);
  return {
    root: d,
    projectDir: d,
    featuresDir: d,
    knowledgeDir: d,
    sharedDir: d,
    analysesDir: d,
    cacheDir: d,
  };
}

/** Locate the single canonical yaml under <featureDir>/cases. */
export function findCasesYaml(featureDir: string): { yamlPath: string; name: string } {
  const casesDir = join(featureDir, "cases");
  if (!existsSync(casesDir)) throw new Error(`cases 目录不存在: ${casesDir}`);
  const yamls = readdirSync(casesDir).filter((f) => f.endsWith(".yaml"));
  if (yamls.length === 0) throw new Error(`cases/ 下没有 yaml 用例源: ${casesDir}`);
  if (yamls.length > 1) throw new Error(`cases/ 下 yaml 不唯一: ${yamls.join(", ")}`);
  return { yamlPath: join(casesDir, yamls[0]), name: yamls[0].replace(/\.yaml$/, "") };
}

/** Build all derived artifacts for one feature dir; returns written paths. */
export async function runCasesBuild(featureDir: string): Promise<string[]> {
  const { yamlPath, name } = findCasesYaml(featureDir);
  const file = parseCasesYaml(readFileSync(yamlPath, "utf8"));
  const problems = validateCases(file);
  if (problems.length > 0) {
    throw new Error(`用例校验未通过:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
  const paths = featurePaths(featureDir);
  const xmindPath = assertWritable(paths, join(featureDir, "cases", `${name}.xmind`));
  const mdPath = assertWritable(paths, join(featureDir, "cases", "exports", `${name}.md`));
  await renderXmind(file, xmindPath);
  mkdirSync(join(featureDir, "cases", "exports"), { recursive: true });
  writeFileAtomic(mdPath, renderMarkdown(file));
  return [xmindPath, mdPath];
}

/** Register the build verb on the cases command. */
export function registerCasesBuild(cases: Command): void {
  cases
    .command("build")
    .description("从 cases/需求名.yaml 派生 xmind 与 exports/md(唯一正式源)")
    .requiredOption("--feature <dir>", "feature 目录路径")
    .action(async (opts: { feature: string }) => {
      try {
        const written = await runCasesBuild(opts.feature);
        for (const p of written) console.log(`built ${p}`);
      } catch (e) {
        console.error((e as Error).message);
        process.exit(1);
      }
    });
}
