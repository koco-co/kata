// 一次性前置：为新 Doris 数据源 dtstack_smoke_DORIS_doris3 按表执行元数据临时同步，
// 使规则集创建页的数据库/数据表下拉可见 test_lindorm_spark 及本批 qzmkxjrp 表。
// 同步完成后该脚本应移除。
import fs from "node:fs";
import path from "node:path";

import { test } from "@playwright/test";

import { getEnvConfig, syncMetadata } from "../../../../../../_shared/helpers";

const ENV = getEnvConfig();
const DATASOURCE = process.env.V6411_SYNC_DATASOURCE?.trim() || ENV.datasources.doris?.assets?.name || ENV.datasources.doris?.batch?.name || "dtstack_smoke_DORIS_doris3";
const DATABASE = process.env.V6411_SYNC_DATABASE?.trim() || ENV.datasources.doris?.sql.database || "test_lindorm_spark";
const TABLE_SUFFIX = (process.env.V6411_CLEAN_TABLE_SUFFIX ?? "qzmkxjrp").trim();
const OUT_DIR = path.join(process.env.KATA_RUN_PATH ?? ".", "metadata-sync-new-doris");

test.setTimeout(90 * 60 * 1000);

function targetTables(): string[] {
  const tables: string[] = [];
  const filter = (process.env.V6411_SYNC_CASES ?? "1-36").trim();
  for (let caseNo = 1; caseNo <= 36; caseNo += 1) {
    const included = filter.split(",").some((item) => {
      const range = item.match(/^(\d+)-(\d+)$/);
      if (range) return caseNo >= Number(range[1]) && caseNo <= Number(range[2]);
      return caseNo === Number(item);
    });
    if (!included) continue;
    const pad = String(caseNo).padStart(2, "0");
    tables.push(`test_info_1_${TABLE_SUFFIX}_${pad}`);
    if (caseNo <= 10) tables.push(`test_info_1_${TABLE_SUFFIX}_${pad}_cmp`);
  }
  return tables;
}

test("新 Doris 数据源元数据按表临时同步", async ({ page }) => {
  const failures: { table: string; error: string }[] = [];
  for (const table of targetTables()) {
    try {
      await syncMetadata(page, DATASOURCE, DATABASE, table, {
        requireExactTable: true,
        allowFilterFallbackForExactTable: true,
      });
      console.log(`[meta-sync] ok ${DATABASE}.${table}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ table, error: message.slice(0, 300) });
      console.log(`[meta-sync] FAIL ${DATABASE}.${table}: ${message.slice(0, 200)}`);
    }
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "sync-result.json"),
    JSON.stringify({ datasource: DATASOURCE, database: DATABASE, failures, at: new Date().toISOString() }, null, 2),
  );
  if (failures.length > 0) {
    throw new Error(`元数据同步失败 ${failures.length} 张表: ${failures.map((item) => item.table).join(", ")}`);
  }
});


