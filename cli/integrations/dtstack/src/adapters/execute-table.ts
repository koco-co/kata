/**
 * Playwright 适配器：建表 + 同步元数据
 *
 * 用于测试脚本中一键完成「执行 SQL → 同步元数据」流程。
 * 内部调用 dtstack-cli 执行 SQL，通过 page.evaluate 同步元数据。
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";

export interface ExecuteTableOptions {
  /** 要执行的 SQL（DDL + DML） */
  sql: string;
  /** 表名（用于元数据查找与同步） */
  tableName: string;
  /** 数据源类型：SparkThrift / Doris */
  datasource: "SparkThrift" | "Doris";
  /** 质量项目名称，来自所选平台 profile */
  project: string;
  /** 环境名，来自所选平台 profile */
  env: string;
  /** 数据库名，来自所选平台 profile */
  database: string;
  /** 质量项目 ID（X-Valid-Project-ID / pid），来自所选平台 profile */
  projectId: number;
  /** 数据源 ID（元数据同步用），来自所选平台 profile */
  dataSourceId: string;
  /** 数据源类型编号，来自所选平台 profile */
  dataSourceType: number;
}

export function resolveDtstackCliInvocation(): { command: string; argsPrefix: string[] } {
  const localBin = "./node_modules/.bin/dtstack-cli";
  if (existsSync(localBin)) return { command: localBin, argsPrefix: [] };
  return { command: "bun", argsPrefix: ["cli/integrations/dtstack/src/cli.ts"] };
}

/** Keep the SQL input inside the mkdtemp directory even when tableName is untrusted. */
export function buildSqlTempPath(sqlDir: string): string {
  return join(sqlDir, "query.sql");
}

/**
 * 执行 SQL 并同步元数据。
 *
 * 使用方式：
 *   import { executeTableSQL } from "dtstack-sdk/adapters/playwright";
 *
 *   await executeTableSQL(page, {
 *     sql: `DROP TABLE IF EXISTS my_table; CREATE TABLE ...; INSERT INTO ... VALUES ...;`,
 *     tableName: "my_table",
 *     datasource: "SparkThrift",
 *     project: profile.projects.quality.name,
 *     env: profile.env,
 *     database: profile.datasources.sparkthrift.sql.database,
 *     projectId: profile.projects.quality.id,
 *     dataSourceId: String(profile.datasources.sparkthrift.metadata.id),
 *     dataSourceType: profile.datasources.sparkthrift.metadata.typeId,
 *   });
 *
 * 流程：
 *   1. 将 SQL 写入临时文件
 *   2. 调用 `dtstack-cli sql exec` 执行
 *   3. 通过 `page.evaluate` 检查元数据是否存在
 *   4. 不存在则调用元数据同步 API + 等待 15s
 *
 * 注意：调用前 page 必须在目标域名上（如已导航到数据资产页面），
 * 否则 `page.evaluate` 中的 fetch 会因缺少 cookie 而失败。
 */
export async function executeTableSQL(page: Page, options: ExecuteTableOptions): Promise<void> {
  const {
    sql,
    tableName,
    datasource,
    project,
    env,
    database,
    projectId,
    dataSourceId,
    dataSourceType,
  } = options;

  // 1. 从浏览器获取最新 cookie（比环境配置文件里的更新鲜）
  const browserCookies = await page.context().cookies();
  const browserCookieStr = browserCookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const cookie = browserCookieStr || process.env[`${env.toUpperCase()}_COOKIE`] || "";

  const sqlDir = mkdtempSync(join(tmpdir(), "dtstack-exec-"));
  const sqlFile = buildSqlTempPath(sqlDir);
  writeFileSync(sqlFile, sql);
  const cli = resolveDtstackCliInvocation();
  try {
    execFileSync(
      cli.command,
      [
        ...cli.argsPrefix,
        "sql",
        "exec",
        "--project",
        project,
        "--datasource",
        datasource,
        "--file",
        sqlFile,
        "--on-exists",
        "warn",
        "--on-missing",
        "warn",
        "--env",
        env,
      ],
      {
        env: { ...process.env, DTSTACK_COOKIE: cookie },
        shell: false,
        stdio: "pipe",
        timeout: 120000,
      },
    );
  } finally {
    rmSync(sqlDir, { recursive: true, force: true });
  }

  const pid = String(projectId);

  // 2. 检查元数据是否已同步
  const exists = await page.evaluate(
    async ({ tName, pId }: { tName: string; pId: string }) => {
      const r = await fetch("/dassets/v1/datamap/queryDetail", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "X-Valid-Project-ID": pId,
        },
        body: JSON.stringify({
          current: 1,
          size: 10,
          metaType: 1,
          search: tName,
          field: "hot",
          asc: false,
        }),
      });
      const d = (await r.json()) as {
        data?: { records?: Array<{ tableName?: string }> };
      };
      return (d?.data?.records ?? []).some((rec) => rec.tableName === tName);
    },
    { tName: tableName, pId: pid },
  );

  if (!exists) {
    await page.evaluate(
      async ({ tName, db, dsId, dsType, pId }) => {
        await fetch("/dmetadata/v1/syncTask/add", {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "X-Valid-Project-ID": pId,
          },
          body: JSON.stringify({
            dataSourceId: dsId,
            dataSourceType: dsType,
            dbList: [db],
            tableList: [{ dbName: db, tableName: tName }],
            syncFilterTermConfigDTO: { syncMetaContent: 0, pastConfiguration: 1 },
            taskType: 0,
          }),
        });
      },
      { tName: tableName, db: database, dsId: dataSourceId, dsType: dataSourceType, pId: pid },
    );
    await page.waitForTimeout(15000);
  }
}
