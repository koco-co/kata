import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Handlebars from "handlebars";
import { repoRoot } from "../../lib/paths.ts";
import { loadHandoffV2Validator } from "../schemas/loaders.ts";

export interface HandoffRenderContext {
  project: string;
  featureId: string;
  runId: string;
  workspaceRoot: string;
}

const tmplPath = join(repoRoot(), "engine/templates/handoff.md.hbs");
const tmpl = Handlebars.compile(readFileSync(tmplPath, "utf-8"));
const validate = loadHandoffV2Validator();

export async function runHandoffRender(ctx: HandoffRenderContext): Promise<{ path: string }> {
  const runDir = join(
    ctx.workspaceRoot,
    ctx.project,
    "features",
    ctx.featureId,
    "results",
    ctx.runId,
  );
  const jsonPath = join(runDir, "handoff.json");
  const data = JSON.parse(readFileSync(jsonPath, "utf-8"));
  if (!validate(data)) {
    throw new Error(`handoff.json schema invalid: ${JSON.stringify(validate.errors)}`);
  }
  const mdPath = join(runDir, "handoff.md");
  writeFileSync(mdPath, tmpl(data), "utf-8");
  return { path: mdPath };
}
