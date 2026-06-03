/**
 * Type contracts for defect-analyze bug & conflict HTML reports.
 * Fields are a permissive superset reverse-engineered from the Handlebars
 * templates (bug-report{,-full,-zentao}.html.hbs, conflict-report.html.hbs);
 * variant templates guard optional fields with {{#if}}. Handlebars renders
 * from the raw parsed JSON, so extra fields pass through; these types serve
 * authoring + validation only.
 */
import type { Severity } from "./scan-report-types.ts";

export const BUG_REPORT_SCHEMA_VERSION = "1.0" as const;

export type BugVariant = "simple" | "full" | "zentao";
export const BUG_VARIANTS: readonly BugVariant[] = ["simple", "full", "zentao"];

export interface StackFrame {
  class?: string;
  method?: string;
  line?: number | string;
  error?: string;
  description?: string;
  is_entry?: boolean;
  is_root?: boolean;
}

export interface FixSuggestion {
  action?: string;
  reason?: string;
  detail?: string;
  location?: string;
  priority?: number | string;
  priority_label?: string;
  title?: string;
  diff_lines?: Array<{ sign: " " | "+" | "-"; text: string }>;
}

export interface BugReport {
  title: string;
  severity: Severity;
  problem_type: string; // code | env | mixed
  priority?: number | string;
  priority_label?: string;
  confidence?: number | string; // number in simple; 'high'|'medium'|'low' in zentao
  confidence_reason?: string;
  analysis_time?: string;
  summary: string;
  root_cause?: string; // simple variant
  stack_trace?: {
    exception_type?: string;
    exception_message?: string;
    root_cause_frame?: string;
    trigger_handler?: string;
    note?: string;
    caused_by_chain?: string[]; // simple
    call_chain?: StackFrame[]; // full / zentao
  };
  request_info?: {
    url?: string;
    method?: string;
    status_code?: number;
    params?: string;
    response_preview?: string;
  };
  environment?: {
    deploy_env?: string;
    framework?: string;
    java_version?: string;
    source_ref?: string;
    tenant?: string; // 租户信息（如 DT_demo）
    account?: string; // 账号信息（如 admin@dtstack.com / DrpEco_2020）
    datasource?: string; // 数据源信息（默认「无」）
  };
  code_location?: {
    file?: string;
    line?: number | string;
    snippet?: string;
    analysis?: string;
    evidence?: string;
    evidence_code?: string;
    snippet_lines?: Array<{ no?: number | string; text: string; error?: boolean }>;
  };
  location?: string;
  error_info?: { curl?: string; log?: string }; // 报错信息：CURL信息 + 日志信息
  reproduction_steps?: string[]; // 复现步骤
  expected?: string; // 预期结果
  actual?: string; // 实际结果
  fix_suggestions?: FixSuggestion[];
}

export interface ConflictItem {
  id: string;
  conflict_id?: string;
  file: string;
  line_range?: string;
  type: string; // logic | format | dependency
  description: string;
  head_intent?: string;
  incoming_intent?: string;
  branches?: { head?: string; incoming?: string };
  decision_basis?: string;
  suggestion?: string;
  merged_code?: string;
  resolution?: "auto" | "manual";
}

export interface ManualDecision {
  conflict_id?: string;
  file?: string;
  description?: string;
  recommended?: string;
  options?: string[];
}

export interface ConflictReport {
  title: string;
  analysis_time?: string;
  branches?: { head?: string; incoming?: string };
  summary: {
    total_conflicts: number;
    manual_required: number;
    auto_resolvable: number;
    files_affected: string[];
  };
  conflicts: ConflictItem[];
  manual_decision_list?: ManualDecision[];
}
