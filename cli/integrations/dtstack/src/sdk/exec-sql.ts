import { readFileSync } from "node:fs";
import { SqlExecutor } from "../core/direct/executor";
import type { ConnectionConfig, QueryResult } from "../core/direct/types";
import type { DtStackClientLike } from "../core/http/client";
import { BatchApi } from "../core/platform/batch";
import { ProjectApi } from "../core/platform/project";

export type ExecSqlOptions =
  | {
      readonly mode?: "platform";
      readonly project: string;
      readonly datasource: string;
      readonly datasourceProfile?: {
        readonly id?: number;
        readonly name?: string;
        readonly typeId?: number;
        readonly aliases?: readonly string[];
      };
      readonly sql?: string;
      readonly file?: string;
      readonly autoCreate?: boolean;
      readonly client: DtStackClientLike;
    }
  | {
      readonly mode: "direct";
      readonly connection: ConnectionConfig;
      readonly sql?: string;
      readonly file?: string;
    };

function readSqlInput(opts: { sql?: string; file?: string }): string {
  if (opts.sql) return opts.sql;
  if (opts.file) return readFileSync(opts.file, "utf-8");
  throw new Error("either --sql or --file is required");
}

export async function execSql(opts: ExecSqlOptions): Promise<QueryResult[]> {
  const sqlText = readSqlInput(opts);

  if (opts.mode === "direct") {
    const exec = new SqlExecutor(opts.connection);
    try {
      const stmts = sqlText
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      return await exec.executeMultiple(stmts);
    } finally {
      await exec.close();
    }
  }

  if (!opts.project) throw new Error("--project is required in platform mode");
  if (!opts.datasource) throw new Error("--datasource is required in platform mode");

  const proj = opts.autoCreate
    ? await new ProjectApi(opts.client).ensureProject({ name: opts.project })
    : await new ProjectApi(opts.client).findByName(opts.project);
  if (!proj) throw new Error(`project not found: ${opts.project} (use --auto-create to create)`);

  const batch = new BatchApi(opts.client);
  const ds = await batch.getProjectDatasource(proj.id, opts.datasource, opts.datasourceProfile);
  if (!ds)
    throw new Error(`datasource type ${opts.datasource} not found in project ${opts.project}`);

  await batch.executeDDL(proj.id, ds, sqlText);
  return [];
}
