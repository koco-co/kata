// mysql 方言（StarRocks/Doris）的真实往返 smoke。仅当设置了 KATA_SR3X_URL 才运行，
// 否则跳过——CI 无 live 端点时不会失败。本地验证：
//   KATA_SR3X_URL='mysql://user:pass@host:port/db' bun test --cwd lib/db
import { describe, expect, it } from "bun:test";
import { withDb } from "../../../lib/db/index.ts";

const url = process.env.KATA_SR3X_URL;
const live = !!url;

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
