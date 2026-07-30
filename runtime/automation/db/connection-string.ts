// 连接串解析与数据源类型 → 方言映射。本模块不依赖任何驱动，纯函数，便于单测。

/** Supported datasource types. Only these four are handled; others are rejected. */
export type DataSourceType = "starrocks" | "doris" | "hive" | "sparkthrift";

/** Wire-protocol family a datasource type connects over. */
export type Dialect = "mysql" | "hive2";

/** Maps each supported datasource type to its wire protocol family. */
export const DIALECT_BY_TYPE: Record<DataSourceType, Dialect> = {
  starrocks: "mysql", // StarRocks FE 走 MySQL 协议
  doris: "mysql", // Doris FE 同样走 MySQL 协议
  hive: "hive2", // HiveServer2 Thrift
  sparkthrift: "hive2", // Spark Thrift Server 兼容 HiveServer2
};

/** Default query port per datasource type, used when the URL omits one. */
export const DEFAULT_PORT: Record<DataSourceType, number> = {
  starrocks: 9030,
  doris: 9030,
  hive: 10000,
  sparkthrift: 10000,
};

/** Connection parameters parsed from a connection URL. */
export interface ConnectionParams {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
}

/** Returns true if the value is one of the four supported datasource types. */
export function isSupportedType(t: string): t is DataSourceType {
  return t === "starrocks" || t === "doris" || t === "hive" || t === "sparkthrift";
}

/**
 * Parse a JDBC-ish connection URL into its parts.
 *
 * Tolerates passwords containing '@', '#' or ':' — credentials are split from
 * the host on the LAST '@', and user from password on the FIRST ':'. The
 * leading `scheme://` is informational and ignored (the datasource type drives
 * the dialect, not the scheme).
 *
 * Example: `mysql://drpeco:DT@Stack#123@192.0.2.225:19030/pw_test`
 *   → { user: "drpeco", password: "DT@Stack#123", host: "192.0.2.225", port: 19030, database: "pw_test" }
 *
 * @param url  connection URL (with or without a `scheme://` prefix)
 * @param type optional datasource type, used to fill the default port when omitted
 */
export function parseConnectionString(url: string, type?: DataSourceType): ConnectionParams {
  if (!url || typeof url !== "string") {
    throw new Error("[runtime/automation/db] connection url is empty");
  }
  // 去掉 scheme://（scheme 仅作信息，不决定方言）
  const schemeMatch = url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/(.*)$/);
  const rest = schemeMatch ? schemeMatch[1] : url;

  // 按最后一个 '@' 拆「凭据」与「主机段」，使密码里的 '@' 不被误切
  const at = rest.lastIndexOf("@");
  const creds = at >= 0 ? rest.slice(0, at) : "";
  const hostPart = at >= 0 ? rest.slice(at + 1) : rest;

  // 凭据按第一个 ':' 拆 user / password（密码可继续含 ':'、'#'）
  let user = creds;
  let password = "";
  const colon = creds.indexOf(":");
  if (colon >= 0) {
    user = creds.slice(0, colon);
    password = creds.slice(colon + 1);
  }

  // 主机段按第一个 '/' 拆「host:port」与「database」；database 去掉查询串
  let hostPort = hostPart;
  let database = "";
  const slash = hostPart.indexOf("/");
  if (slash >= 0) {
    hostPort = hostPart.slice(0, slash);
    database = hostPart.slice(slash + 1).split("?")[0];
  }

  // host:port 按最后一个 ':' 拆（IPv6 暂不在四种数据源范围内）
  let host = hostPort;
  let port = type ? DEFAULT_PORT[type] : Number.NaN;
  const portColon = hostPort.lastIndexOf(":");
  if (portColon >= 0) {
    host = hostPort.slice(0, portColon);
    const portText = hostPort.slice(portColon + 1);
    const parsed = Number(portText);
    // 显式写了端口但解析不出数字是直接配置错误，不能静默回落默认端口
    if (!Number.isFinite(parsed)) {
      throw new Error(`[runtime/automation/db] invalid port in connection url: '${portText}'`);
    }
    port = parsed;
  }

  // 错误消息不回显原始 url：其中可能包含口令
  if (!host) throw new Error("[runtime/automation/db] cannot parse host from connection url");
  if (!Number.isFinite(port)) {
    throw new Error(
      "[runtime/automation/db] no port in connection url and no datasource type to default it",
    );
  }
  return { user, password, host, port, database };
}
