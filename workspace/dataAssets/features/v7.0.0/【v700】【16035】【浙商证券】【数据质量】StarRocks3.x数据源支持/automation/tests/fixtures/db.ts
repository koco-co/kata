// 本 feature 的 StarRocks 运行时 SQL 绑定。
// 用例用它在运行时建表/删表/改数据，使「前置条件」自包含、可重入。
// 连接信息从本机 config/infra/data_sources.yaml 与 credentials.yaml 读取，不写进脚本。
import { type DataSourceType, withDb } from "../../../../../../../../lib/db";
import { readInfraConfig } from "../../../../../../../../cli/lib/infra-config";
import { getEnvConfig } from "../../../../../../_shared/runtime/env-profile";

function dataSourceName(): string {
  const datasource = getEnvConfig().datasources.starrocks;
  if (!datasource) throw new Error("current environment does not configure starrocks datasource");
  return datasource.assets.name;
}

function connection(): {
  type: DataSourceType;
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
} {
  const config = readInfraConfig();
  const sourceName = dataSourceName();
  const source = config.data_sources[sourceName];
  if (!source) {
    throw new Error(
      `[_db] data source '${sourceName}' is not configured in config/infra/data_sources.yaml`,
    );
  }
  const credential = config.credentials[source.credential_ref];
  if (!credential) {
    throw new Error(`[_db] credential profile '${source.credential_ref}' is not configured`);
  }
  return {
    type: source.type as DataSourceType,
    host: source.host,
    port: source.port,
    user: credential.username,
    password: credential.password,
    ...(source.database ? { database: source.database } : {}),
  };
}

/** Run setup/teardown SQL (DDL/DML, multi-statement OK) against the SR3.x datasource. */
export async function runSr3xSql(sql: string): Promise<void> {
  await withDb(connection(), (db) => db.exec(sql));
}

/** Query the SR3.x datasource and return rows (for asserting/deriving expected metrics). */
export async function querySr3x<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  return withDb(connection(), (db) => db.query<T>(sql));
}
