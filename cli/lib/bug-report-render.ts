import { readFileSync } from "node:fs";
import { join } from "node:path";
import Handlebars from "handlebars";
import type { BugReport, BugVariant, ConflictReport } from "./bug-report-types.ts";
import { repoRoot } from "./paths.ts";
import type { Severity } from "./scan-report-types.ts";

const VARIANT_TEMPLATE: Record<BugVariant, string> = {
  zentao: "bug-report-zentao.html.hbs",
};
const CONFLICT_TEMPLATE = "conflict-report.html.hbs";

const SEVERITY_CLASS: Record<Severity, string> = {
  critical: "critical",
  major: "major",
  normal: "normal",
  minor: "low",
};

let helpersRegistered = false;
function registerHelpers(): void {
  if (helpersRegistered) return;
  // eq: 支持 block ({{#eq a b}}…{{/eq}}) 与 inline 子表达式 ((eq a b))
  Handlebars.registerHelper(
    "eq",
    function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
      const equal = a === b;
      if (options && typeof options.fn === "function") {
        return equal ? options.fn(this) : options.inverse(this);
      }
      return equal;
    },
  );
  // gte: 数值 >=，同样兼容 block 与 inline
  Handlebars.registerHelper(
    "gte",
    function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
      const pass = typeof a === "number" && typeof b === "number" && a >= b;
      if (options && typeof options.fn === "function") {
        return pass ? options.fn(this) : options.inverse(this);
      }
      return pass;
    },
  );
  helpersRegistered = true;
}

const cache = new Map<string, HandlebarsTemplateDelegate>();
function getTemplate(file: string): HandlebarsTemplateDelegate {
  const cached = cache.get(file);
  if (cached) return cached;
  registerHelpers();
  const src = readFileSync(join(repoRoot(), "cli/templates", file), "utf8");
  const tpl = Handlebars.compile(src);
  cache.set(file, tpl);
  return tpl;
}

/** Render a BugReport to HTML using the specified variant template. */
export function renderBugReport(report: BugReport, variant: BugVariant = "zentao"): string {
  const severityClass = SEVERITY_CLASS[report.severity] ?? "normal";
  return getTemplate(VARIANT_TEMPLATE[variant])({ ...report, severityClass });
}

/** Render a ConflictReport to HTML. */
export function renderConflictReport(report: ConflictReport): string {
  return getTemplate(CONFLICT_TEMPLATE)(report);
}
