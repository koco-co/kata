// 多数据源运行时 SQL 客户端：供 Playwright 脚本在运行时对目标数据源建表/删表/查数据。
//
// 支持四种数据源（其余暂不处理）：
//   - starrocks / doris  → MySQL 线协议（mysql2 驱动）
//   - hive / sparkthrift → HiveServer2 Thrift 协议（hive-driver 驱动）
//
// 用法（在用例 setup/teardown 中）：
//   import { withDb } from "<repo>/lib/db";
//   await withDb({ type: "starrocks", url: process.env.KATA_SR3X_URL }, async (db) => {
//     await db.exec("DROP TABLE IF EXISTS t; CREATE TABLE t(...); INSERT INTO t VALUES(...);");
//     const rows = await db.query<{ c: number }>("SELECT count(*) AS c FROM t");
//   });
//
// 注：连接信息（含口令）从参数或环境变量传入，不写进脚本或入口文档。
import {
  type ConnectionParams,
  type DataSourceType,
  DIALECT_BY_TYPE,
  isSupportedType,
  parseConnectionString,
} from "./connection-string";
import { splitSqlStatements } from "./sql-split";

export {
  type ConnectionParams,
  type DataSourceType,
  DEFAULT_PORT,
  DIALECT_BY_TYPE,
  type Dialect,
  isSupportedType,
  parseConnectionString,
} from "./connection-string";
export { splitSqlStatements } from "./sql-split";

/** A minimal SQL client over one connection. */
export interface DbClient {
  /** Run a SELECT and return result rows as plain objects. */
  query<T = Record<string, unknown>>(sql: string): Promise<T[]>;
  /** Run DDL/DML (and multi-statement setup scripts). Returns nothing. */
  exec(sql: string): Promise<void>;
  /** Close the underlying connection. */
  close(): Promise<void>;
}

/** Options for opening a datasource connection. */
export interface DbConnectOptions {
  /** Datasource type — drives the wire protocol (one of the four supported). */
  type: DataSourceType;
  /** Connection URL, e.g. `mysql://user:pass@host:port/db`. Falls back to `process.env[urlEnv]`. */
  url?: string;
  /** Env var name to read the URL from when `url` is omitted (default `KATA_DB_URL`). */
  urlEnv?: string;
  /** Explicit params (override values parsed from `url`). */
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  /** Connect timeout in ms (default 15000). */
  connectTimeoutMs?: number;
}

// 解析最终连接参数：优先显式参数，其次 url（或 urlEnv 指向的环境变量）。
function resolveParams(opts: DbConnectOptions): ConnectionParams {
  if (!isSupportedType(opts.type)) {
    throw new Error(
      `[lib/db] unsupported datasource type '${opts.type}'. Supported: starrocks, doris, hive, sparkthrift.`,
    );
  }
  const url = opts.url ?? process.env[opts.urlEnv ?? "KATA_DB_URL"];
  const base: ConnectionParams = url
    ? parseConnectionString(url, opts.type)
    : { user: "", password: "", host: "", port: Number.NaN, database: "" };
  const merged: ConnectionParams = {
    host: opts.host ?? base.host,
    port: opts.port ?? base.port,
    user: opts.user ?? base.user,
    password: opts.password ?? base.password,
    database: opts.database ?? base.database,
  };
  if (!merged.host) throw new Error("[lib/db] no host (provide url or host).");
  if (!Number.isFinite(merged.port))
    throw new Error("[lib/db] no port (provide url with port or port).");
  return merged;
}

// ─── mysql 方言（starrocks / doris）───

async function createMysqlClient(p: ConnectionParams, timeout: number): Promise<DbClient> {
  const mysql = (await import("mysql2/promise")).default;
  const conn = await mysql.createConnection({
    host: p.host,
    port: p.port,
    user: p.user,
    password: p.password,
    database: p.database || undefined,
    multipleStatements: true, // 支持一段多语句 setup 脚本
    connectTimeout: timeout,
  });
  return {
    async query<T>(sql: string): Promise<T[]> {
      const [rows] = await conn.query(sql);
      return rows as T[];
    },
    async exec(sql: string): Promise<void> {
      await conn.query(sql);
    },
    async close(): Promise<void> {
      await conn.end();
    },
  };
}

// ─── hive2 方言（hive / sparkthrift，HiveServer2 Thrift）───

async function createHiveClient(p: ConnectionParams, timeout: number): Promise<DbClient> {
  // hive-driver 的类型多为 any，这里按其运行时 API 接入
  const hive = (await import("hive-driver")) as unknown as {
    HiveClient: new (
      svc: unknown,
      types: unknown,
    ) => {
      connect: (o: unknown, c: unknown, a: unknown) => Promise<unknown>;
      openSession: (r: unknown) => Promise<HiveSession>;
      close: () => void;
    };
    HiveUtils: new (types: unknown) => HiveUtils;
    connections: { TcpConnection: new () => unknown };
    auth: { PlainTcpAuthentication: new (o: { username: string; password: string }) => unknown };
    thrift: {
      TCLIService: unknown;
      TCLIService_types: { TProtocolVersion: Record<string, number> };
    };
  };
  type HiveOperation = unknown;
  interface HiveSession {
    executeStatement: (sql: string, o?: { runAsync?: boolean }) => Promise<HiveOperation>;
    close: () => Promise<unknown>;
  }
  interface HiveUtils {
    waitUntilReady: (op: HiveOperation, progress: boolean, cb: () => void) => Promise<unknown>;
    fetchAll: (op: HiveOperation) => Promise<unknown>;
    getResult: (op: HiveOperation) => { getValue: () => unknown[] };
  }

  const client = new hive.HiveClient(hive.thrift.TCLIService, hive.thrift.TCLIService_types);
  await client.connect(
    { host: p.host, port: p.port, options: { timeout } },
    new hive.connections.TcpConnection(),
    new hive.auth.PlainTcpAuthentication({ username: p.user, password: p.password || "" }),
  );
  const session = await client.openSession({
    client_protocol: hive.thrift.TCLIService_types.TProtocolVersion.HIVE_CLI_SERVICE_PROTOCOL_V10,
  });
  const utils = new hive.HiveUtils(hive.thrift.TCLIService_types);

  async function run(sql: string): Promise<unknown[]> {
    const op = await session.executeStatement(sql, { runAsync: true });
    await utils.waitUntilReady(op, false, () => {});
    await utils.fetchAll(op);
    const rows = utils.getResult(op).getValue();
    const closable = op as { close?: () => Promise<unknown> };
    if (typeof closable.close === "function") await closable.close();
    return Array.isArray(rows) ? rows : [];
  }

  if (p.database) await run(`USE \`${p.database}\``);

  return {
    async query<T>(sql: string): Promise<T[]> {
      return (await run(sql)) as T[];
    },
    async exec(sql: string): Promise<void> {
      for (const stmt of splitSqlStatements(sql)) await run(stmt);
    },
    async close(): Promise<void> {
      await session.close();
      client.close();
    },
  };
}

/**
 * Open a SQL client for one of the four supported datasources.
 * Remember to `close()` it; prefer {@link withDb} which closes automatically.
 */
export async function createDbClient(opts: DbConnectOptions): Promise<DbClient> {
  const p = resolveParams(opts);
  const timeout = opts.connectTimeoutMs ?? 15000;
  const dialect = DIALECT_BY_TYPE[opts.type];
  return dialect === "mysql" ? createMysqlClient(p, timeout) : createHiveClient(p, timeout);
}

/**
 * Open a client, run `fn`, and always close the connection afterwards.
 * The canonical entry point for case setup/teardown SQL.
 */
export async function withDb<T>(
  opts: DbConnectOptions,
  fn: (db: DbClient) => Promise<T>,
): Promise<T> {
  const db = await createDbClient(opts);
  try {
    return await fn(db);
  } finally {
    await db.close();
  }
}
