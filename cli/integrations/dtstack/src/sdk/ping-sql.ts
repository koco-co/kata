import { SqlExecutor } from "../core/direct/executor";
import type { ConnectionConfig } from "../core/direct/types";
import type { DtStackClientLike } from "../core/http/client";
import { BatchApi } from "../core/platform/batch";
import { ProjectApi } from "../core/platform/project";

export type PingSqlOptions =
  | {
      readonly mode?: "platform";
      readonly project: string;
      readonly datasource: string;
      readonly client: DtStackClientLike;
    }
  | { readonly mode: "direct"; readonly connection: ConnectionConfig };

export async function pingSql(opts: PingSqlOptions): Promise<boolean> {
  if (opts.mode === "direct") {
    const exec = new SqlExecutor(opts.connection);
    try {
      await exec.execute("SELECT 1");
      return true;
    } finally {
      await exec.close();
    }
  }
  const proj = await new ProjectApi(opts.client).findByName(opts.project);
  if (!proj) return false;
  const ds = await new BatchApi(opts.client).getProjectDatasource(proj.id, opts.datasource);
  return ds !== null;
}
