// mysql 方言（StarRocks/Doris）的真实往返 smoke。必须显式注入 KATA_DB_URL
// 并设置 KATA_RUN_LIVE=1 才跑，防止全量测试触发真实库。
// 本地验证: KATA_RUN_LIVE=1 KATA_DB_URL='mysql://...' bun test tests/lib/db
import { describe, expect, it } from "bun:test";
import { withDb } from "../../../lib/db/index.ts";

const url = process.env.KATA_DB_URL;
const live = process.env.KATA_RUN_LIVE === "1" && !!url;

describe("lib/db mysql dialect (live)", () => {
  it.skipIf(!live)("creates a table, inserts, queries, and drops via the client API", async () => {
    const rows = await withDb({ type: "starrocks", url }, async (db) => {
      await db.exec(`
        DROP TABLE IF EXISTS zszq_libdb_smoke;
        CREATE TABLE zszq_libdb_smoke (id INT)
          ENGINE=OLAP DUPLICATE KEY(id)
          DISTRIBUTED BY HASH(id) BUCKETS 1 PROPERTIES ("replication_num" = "1");
        INSERT INTO zszq_libdb_smoke VALUES (1),(2),(3);
      `);
      const r = await db.query<{ c: number }>("SELECT count(*) AS c FROM zszq_libdb_smoke");
      await db.exec("DROP TABLE IF EXISTS zszq_libdb_smoke");
      return r;
    });
    expect(Number(rows[0]?.c)).toBe(3);
  });
});
