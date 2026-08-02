export const VERSION = "0.1.0";
export type { Session } from "./core/auth/login";
export type { DtStackClientLike, DtStackClientOptions, DtStackResponse } from "./core/http/client";
export { DtStackClient } from "./core/http/client";
export type { Project } from "./core/platform/project";
export { getSession, whoami } from "./sdk/auth";
export type { EnsureProjectOptions } from "./sdk/ensure-project";
export { ensureProject } from "./sdk/ensure-project";
export type { ExecSqlOptions } from "./sdk/exec-sql";
export { execSql } from "./sdk/exec-sql";
export type { PingSqlOptions } from "./sdk/ping-sql";
export { pingSql } from "./sdk/ping-sql";
export type {
  PrecondDatasourceProfile,
  PrecondSetupOptions,
  PrecondSetupResult,
  PrecondTable,
} from "./sdk/precond-setup";
export { precondSetup } from "./sdk/precond-setup";
