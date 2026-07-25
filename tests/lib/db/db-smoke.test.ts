// mysql 方言（StarRocks/Doris）的真实往返 smoke。bun 会自动加载根 .env,
// 所以仅设 KATA_SR3X_URL 不触发;必须显式 KATA_RUN_LIVE=1 才跑,防止全量
// bun test 在配过 URL 的机器上隐式打真实库。本地验证:
//   KATA_RUN_LIVE=1 bun test tests/lib/db
import { describe, expect, it } from "bun:test";
import { withDb } from "../../../lib/db/index.ts";

const url = process.env.KATA_SR3X_URL;
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
