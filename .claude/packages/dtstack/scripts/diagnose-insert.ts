/**
 * 端到端验证：跑 t16 风格的 SQL（DROP + CREATE + INSERT），
 * 通过新封装的 BatchApi.executeDDL 路径。
 *
 * 运行：bun run .claude/packages/dtstack/scripts/diagnose-insert.ts
 */

import { readFileSync } from "node:fs";
import { getEnv, getEnvOrThrow, initEnv } from "@shared/lib/env.ts";
import { authSessionPath, repoRoot } from "@shared/lib/paths.ts";
import { DtStackClient } from "../src/core/http/client";
import { BatchApi } from "../src/core/platform/batch";
import { ProjectApi } from "../src/core/platform/project";

initEnv({ cwd: repoRoot() });
const KATA_PROJECT = getEnvOrThrow("KATA_ACTIVE_PROJECT");
const TARGET_ENV = getEnv("KATA_TARGET_ENV") ?? getEnv("ACTIVE_ENV") ?? "ltqc";
const BASE_URL =
  getEnv(`${TARGET_ENV.toUpperCase().replace(/-/g, "_")}_BASE_URL`) ??
  getEnvOrThrow("UI_AUTOTEST_BASE_URL");
const SESSION_FILE = authSessionPath(KATA_PROJECT, TARGET_ENV);
const PROJECT_NAME = "pw_test";
const DATASOURCE_TYPE = "sparkthrift";

const TABLE = `t16_diag_${Date.now()}`;
const SQL = `
DROP TABLE IF EXISTS pw_test.${TABLE};
CREATE TABLE pw_test.${TABLE} (id INT, info STRING) STORED AS PARQUET;
INSERT INTO pw_test.${TABLE} VALUES (1, '{"key1":"张三","key2":25}'), (2, '{"key1":"李四"}'), (3, '{"key2":30}');
`.trim();

function loadCookie(): string {
  const raw = JSON.parse(readFileSync(SESSION_FILE, "utf-8")) as {
    cookies: { name: string; value: string }[];
  };
  return raw.cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function main(): Promise<void> {
  const client = new DtStackClient({ baseUrl: BASE_URL, cookie: loadCookie() });
  console.log(`[diag] table = pw_test.${TABLE}`);

  const proj = await new ProjectApi(client).findByName(PROJECT_NAME);
  if (!proj) throw new Error(`project ${PROJECT_NAME} not found`);
  console.log(`[diag] projectId = ${proj.id}`);

  const batch = new BatchApi(client, `diag-${BASE_URL}`);
  const ds = await batch.getProjectDatasource(proj.id, DATASOURCE_TYPE);
  if (!ds) throw new Error(`datasource ${DATASOURCE_TYPE} not found`);
  console.log(`[diag] datasourceId = ${ds.id} dataName=${ds.dataName}`);

  console.log("\n[diag] executing DROP + CREATE + INSERT via BatchApi.executeDDL …");
  const t0 = Date.now();
  await batch.executeDDL(proj.id, ds, SQL);
  console.log(`[diag] ✅ executeDDL completed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error("[diag] ❌", e);
  process.exit(1);
});
