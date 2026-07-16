# 运行时 SQL 工具（lib/db）

`lib/db` 是一个多数据源运行时 SQL 客户端，供 Playwright 用例在执行时直连目标数据源做**建表 / 删表 / 改数据 / 查真实度量**。用它把用例「前置条件」里的 DDL/DML 变成自包含、可重入的 setup，并在断言前核对平台规则该返回什么。

## 何时用（使用时机）

- **§4 ui-probe / §5 plan-reconcile**：核对每条用例声明的期望结果（校验通过/异常）是否与目标表**真实数据**一致——用 `query` 算出实际度量（空值数、重复数、distinct 等），避免照 archive 描述臆测。
- **§6 generate**：把用例「前置条件」的 `DROP/CREATE/INSERT` 写进 `beforeEach`，用 `exec` 跑一遍，让数据状态自建、可重入（多次跑结果一致）。
- **§7 self-run setup/teardown**：需要「建表后校验」「删表触发异常」「改数据后重跑翻转状态」这类用例时，在测试内用 `exec` 直接操作表（如往维表补插一行让跨表校验由异常转通过）。

不需要运行时改数据、目标表已由人工/前置准备好且状态稳定的用例，不必引入本工具。

## 怎么用（使用方式）

```ts
import { withDb } from "<repo-root>/lib/db"; // 相对路径按用例文件深度调整

// setup：建表 + 灌数（多语句 setup 脚本 exec 一次跑完）
await withDb({ type: "starrocks", url: process.env.KATA_SR3X_URL }, async (db) => {
  await db.exec(`
    DROP TABLE IF EXISTS t;
    CREATE TABLE t (...) ENGINE=OLAP DUPLICATE KEY(id) DISTRIBUTED BY HASH(id) BUCKETS 1
      PROPERTIES ("replication_num" = "1");
    INSERT INTO t VALUES (...);
  `);
});

// 核对真实度量
const rows = await withDb({ type: "starrocks", url: process.env.KATA_SR3X_URL },
  (db) => db.query<{ c: number }>("SELECT count(*) AS c FROM t WHERE col IS NULL"));
```

- `withDb(opts, fn)`：打开连接 → 跑 `fn` → 自动关闭（首选）。`createDbClient(opts)` 返回需手动 `close()` 的客户端。
- `db.query<T>(sql)`：跑 SELECT，返回行对象数组。
- `db.exec(sql)`：跑 DDL/DML，支持一段多语句 setup 脚本（mysql 走 multipleStatements；hive 自动按 `;` 拆分逐条执行）。

## 支持的数据源（仅这四种）

| type          | 协议 / 驱动                       | 默认端口 |
| ------------- | --------------------------------- | -------- |
| `starrocks`   | MySQL 线协议 / mysql2             | 9030     |
| `doris`       | MySQL 线协议 / mysql2             | 9030     |
| `hive`        | HiveServer2 Thrift / hive-driver  | 10000    |
| `sparkthrift` | HiveServer2 Thrift / hive-driver  | 10000    |

其它数据源暂不支持。`type` 决定方言（mysql 家族 vs hive2 家族）。

## 连接信息

- 连接 URL 形如 `mysql://user:password@host:port/db`，从环境变量读取（如 `KATA_SR3X_URL`），放根 `.env` 或调用进程环境，**不写进脚本或入口文档**。
- 解析容忍密码含 `@`/`#`/`:`：按**最后一个 `@`** 拆凭据与主机，按**第一个 `:`** 拆 user/password。例：`mysql://drpeco:DT@Stack#123@host:9030/db` → user=`drpeco`, password=`DT@Stack#123`。
- `opts.url` 缺省时从 `process.env[opts.urlEnv ?? "KATA_DB_URL"]` 读；也可直接传 `host/port/user/password/database` 覆盖。

## 注意

- 工具只发 SQL，不碰平台 UI；建表/删表是对**业务数据源**操作，需用户已授权该数据源用于测试。
- 单测见 `lib/db/connection-string.test.ts`；带 `KATA_SR3X_URL` 时 `lib/db/db-smoke.test.ts` 跑真实往返 smoke。
