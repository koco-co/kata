export type KataSeverity = "error" | "warning";

export type KataIssue = {
  code: string;
  severity: KataSeverity;
  message: string;
  path: string;
  contractId?: string;
};

export type KataResult<T> = {
  ok: boolean;
  value?: T;
  issues: KataIssue[];
};
