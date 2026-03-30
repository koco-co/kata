import type { DtStackClientLike } from "../core/http/client";
import { type CreateProjectOptions, type Project, ProjectApi } from "../core/platform/project";

export interface EnsureProjectOptions extends CreateProjectOptions {
  readonly client: DtStackClientLike;
}

export async function ensureProject(opts: EnsureProjectOptions): Promise<Project> {
  return new ProjectApi(opts.client).ensureProject(opts);
}
