import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ProjectPaths } from "./types.ts";

/** Locate the repo root by walking up to a dir with workspace/ + package.json. */
export function locateProjectRoot(fromDir: string = process.cwd()): string {
  let dir = resolve(fromDir);
  for (;;) {
    if (existsSync(join(dir, "workspace")) && existsSync(join(dir, "package.json"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) throw new Error("kata: 未找到仓库根(缺 workspace/ 与 package.json)");
    dir = parent;
  }
}

/** Return canonical paths for a workspace project; throws if the project dir is absent. */
export function locateProject(project: string, root?: string): ProjectPaths {
  const r = root ?? locateProjectRoot();
  const projectDir = join(r, "workspace", project);
  if (!existsSync(projectDir)) throw new Error(`kata: 未知项目 ${project}(${projectDir} 不存在)`);
  return {
    root: r,
    projectDir,
    featuresDir: join(projectDir, "features"),
    knowledgeDir: join(projectDir, "knowledge"),
    sharedDir: join(projectDir, "_shared"),
    analysesDir: join(projectDir, "analyses"),
    cacheDir: join(projectDir, ".cache"),
  };
}
