import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import Handlebars from "handlebars";
import { contractPath, repoRoot } from "@shared/lib/paths.ts";
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

const correctionsSchemaPath = contractPath("schemas", "CaseCorrections.v1.schema.json");
const correctionsAjv = new Ajv2020({ strict: false });
addFormats(correctionsAjv);
const validateCorrections = correctionsAjv.compile(
  JSON.parse(readFileSync(correctionsSchemaPath, "utf-8")),
);

interface CaseFeedbackContext {
  total: number;
  corrections_md: string;
  apply_command: string;
  by_category_line: string;
  is_empty: boolean;
}

function loadCaseFeedback(runDir: string): CaseFeedbackContext | null {
  const sidecarPath = join(runDir, "case-corrections-summary.json");
  if (!existsSync(sidecarPath)) {
    return null;
  }
  const summary = JSON.parse(readFileSync(sidecarPath, "utf-8"));
  if (!validateCorrections(summary)) {
    throw new Error(
      `case-corrections-summary.json invalid (CaseCorrections@1): ${JSON.stringify(validateCorrections.errors)}`,
    );
  }
  const byCategory = summary.by_category as Record<string, number>;
  const byCategoryLine = Object.entries(byCategory)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}=${n}`)
    .join(", ");
  return {
    total: summary.total,
    corrections_md: summary.corrections_md,
    apply_command: summary.apply_command,
    by_category_line: byCategoryLine || "none",
    is_empty: summary.total === 0,
  };
}

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
  const caseFeedback = loadCaseFeedback(runDir);
  const mdPath = join(runDir, "handoff.md");
  writeFileSync(mdPath, tmpl({ ...data, case_feedback: caseFeedback }), "utf-8");
  return { path: mdPath };
}
