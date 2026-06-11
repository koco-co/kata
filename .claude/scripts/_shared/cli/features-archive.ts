import { existsSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { ARCHIVED_DIR, VERSION_DIR_RE } from "@shared/lib/features/layout.ts";
import { runFeaturesIndex } from "./features-index.ts";

export interface FeaturesArchiveContext {
  project: string;
  workspaceRoot: string;
  /** Semantic version directory name, e.g. v6.4.10 */
  version: string;
  /** Inject renameSync in tests; inject a git mv wrapper in real runs. */
  move?: (from: string, to: string) => void;
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
