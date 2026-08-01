import { lstatSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import type { ProjectPaths } from "./types.ts";

export class PathError extends Error {
  code: "OUTSIDE_PROJECT" | "FORBIDDEN";
  constructor(code: "OUTSIDE_PROJECT" | "FORBIDDEN", msg: string) {
    super(msg);
    this.code = code;
  }
}

/** Assert target resolves inside the project dir; return the normalized absolute path. */
export function assertInside(paths: ProjectPaths, target: string): string {
  const abs = resolve(target);
  const base = resolve(paths.projectDir) + sep;
  if (abs !== resolve(paths.projectDir) && !abs.startsWith(base)) {
    throw new PathError("OUTSIDE_PROJECT", `kata: 路径越界 ${abs}(须在 ${paths.projectDir} 内)`);
  }
  return abs;
}

/** Assert a workspace path is writable (inside project, not a reserved system file). */
export function assertWritable(paths: ProjectPaths, target: string): string {
  const abs = assertInside(paths, target);
  if (/(^|\/)\.git(\/|$)/.test(abs)) {
    throw new PathError("FORBIDDEN", `kata: 禁止写入 .git 内部 ${abs}`);
  }
  const base = resolve(paths.projectDir);
  const rel = relative(base, abs);
  let current = base;
  for (const segment of rel.split(sep).filter(Boolean)) {
    current = resolve(current, segment);
    try {
      if (lstatSync(current).isSymbolicLink()) {
        throw new PathError("FORBIDDEN", `kata: 禁止通过符号链接写入 ${current}`);
      }
    } catch (error) {
      if (error instanceof PathError) throw error;
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      break;
    }
  }
  return abs;
}
