export type AiCoreSeverity = "error" | "warning";

export type AiCoreIssue = {
  code: string;
  severity: AiCoreSeverity;
  message: string;
  path: string;
  contractId?: string;
};

export type AiCoreResult<T> = {
  ok: boolean;
  value?: T;
  issues: AiCoreIssue[];
};

export type AiCoreSchemaRef = {
  id: string;
  version: number;
  path: string;
};

export type AiCoreGuardRef = {
  id: string;
  kind:
    | "write_policy"
    | "content_lint"
    | "schema_guard"
    | "plugin_policy"
    | "runner_policy"
    | "failure_policy";
  implementation: string;
};

export type AiCoreRuntimeRoot = {
  path: string;
  status: "declared" | "transitional";
  hidden_id_lint: boolean;
};

export type ProjectionDisposition = "generated" | "copied_vendor" | "local_exception" | "deleted";

export type ProjectionRuntimeName = "claude" | "codex" | "root";

export type ProjectionInventoryRow = {
  path: string;
  runtime: ProjectionRuntimeName;
  disposition: ProjectionDisposition;
  source?: string;
  owner?: string;
  expires?: string;
  reason?: string;
};

export type AiCoreContractRef = {
  id: string;
  path: string;
};

export type AiCoreProject = {
  root: string;
  schemas: AiCoreSchemaRef[];
  guards: AiCoreGuardRef[];
  implementationRoots: string[];
  runtimeRoots: AiCoreRuntimeRoot[];
  skills: AiCoreContractRef[];
  prompts: AiCoreContractRef[];
  workflows: AiCoreContractRef[];
  agents: AiCoreContractRef[];
  plugins: AiCoreContractRef[];
};
