import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Handlebars from "handlebars";
import { resolveFeatureRunsDir } from "./features-layout.ts";
import { repoRoot } from "./workspace-locator.ts";

export interface HandoffRenderContext {
  project: string;
  featureId: string;
  runId: string;
  workspaceRoot: string;
}

// handoff.json 必需的顶层字段(宽松校验, 不用 JSON Schema)
const REQUIRED_FIELDS = ["feature_id", "run_id", "status"] as const;

/** Render handoff.md from runs/<runId>/handoff.json via the shared Handlebars template. */
export function runHandoffRender(ctx: HandoffRenderContext): { path: string } {
  const tmplPath = join(repoRoot(), "cli/templates/handoff.md.hbs");
  const tmpl = Handlebars.compile(readFileSync(tmplPath, "utf-8"));

  // 在两层结构中按 dirName 查找 feature
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const runDir = join(resolveFeatureRunsDir(featuresDir, ctx.featureId), ctx.runId);
  const jsonPath = join(runDir, "handoff.json");
  if (!existsSync(jsonPath)) throw new Error(`handoff.json 不存在: ${jsonPath}`);

  const data = JSON.parse(readFileSync(jsonPath, "utf-8")) as Record<string, unknown>;
  const missing = REQUIRED_FIELDS.filter((f) => data[f] === undefined);
  if (missing.length > 0) {
    throw new Error(`handoff.json 缺必需字段: ${missing.join(", ")}`);
  }

  const mdPath = join(runDir, "handoff.md");
  writeFileSync(mdPath, tmpl(data), "utf-8");
  return { path: mdPath };
}
