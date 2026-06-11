import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { ARCHIVED_DIR, VERSION_DIR_RE } from "@shared/lib/features/layout.ts";
import { runFeaturesIndex } from "./features-index.ts";

export interface FeaturesArchiveContext {
  project: string;
  workspaceRoot: string;
  /** Semantic version directory name, e.g. v6.4.10 */
  version: string;
  /** Inject renameSync in tests without git; defaults to {@link gitMove} in real runs. */
  move?: (from: string, to: string) => void;
}

/**
 * Move a version directory during archive, preferring `git mv` with a renameSync fallback.
 *
 * Why archive keeps `git mv` while `migrate` had to drop it: archive performs a
 * SINGLE whole-directory move of features/<version>/ → features/_archived/<version>/.
 * `git mv` on a whole directory is a directory-level rename(2): it physically
 * relocates the entire subtree — including ignored runtime files such as runs/ —
 * and rewrites the index for every tracked path under it in one shot, leaving no
 * husk in the old location and a consistent index (status shows a clean `R`).
 *
 * migrate's husk bug had the opposite shape: it moved individual paths (some
 * ignored, so `git mv` failed) and pre-deleted manifest.json (so the whole-dir
 * `git mv` failed and fell back to renameSync mid-reorg), stranding a flat husk,
 * a duplicate copy, and an RD orphan in the index. archive does neither, so it
 * never reaches that root cause.
 *
 * The fallback fires on a non-git env, or a version dir holding only ignored
 * files (`git mv` reports "source directory is empty"). renameSync is itself a
 * whole-directory rename and is equally husk-free.
 *
 * Both paths are pinned by the real-git regression in features-archive.test.ts
 * ("git-consistent archive (husk regression)").
 */
export function gitMove(from: string, to: string): void {
  try {
    // 在 from 所在目录里调用 git，让 git 从该路径定位所属仓库，而非依赖进程 cwd——
    // 这样无论调用方在哪个目录，git mv 都作用于真正包含目标的那个仓库。
    execFileSync("git", ["mv", from, to], { cwd: dirname(from), stdio: "pipe" });
  } catch {
    console.warn("WARN: git mv failed, falling back to rename (non-git env?)");
    renameSync(from, to);
  }
}

/**
 * Archive a version directory by moving it under features/_archived/<version>.
 * Re-generates INDEX.md after the move.
 */
export async function runFeaturesArchive(
  ctx: FeaturesArchiveContext,
): Promise<{ from: string; to: string }> {
  if (!VERSION_DIR_RE.test(ctx.version)) throw new Error(`invalid version: ${ctx.version}`);

  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const from = join(featuresDir, ctx.version);
  const to = join(featuresDir, ARCHIVED_DIR, ctx.version);

  if (!existsSync(from)) throw new Error(`version dir not found: ${from}`);
  if (existsSync(to)) throw new Error(`already archived: ${to}`);

  // 确保 _archived/ 目录存在
  mkdirSync(join(featuresDir, ARCHIVED_DIR), { recursive: true });

  // 执行移动（默认 renameSync；生产环境可注入 git mv 包装）
  (ctx.move ?? renameSync)(from, to);

  // 重新生成 INDEX.md
  await runFeaturesIndex({ project: ctx.project, workspaceRoot: ctx.workspaceRoot });

  return { from, to };
}
