// 本 feature 的 SR3.x（StarRocks，MySQL 协议）运行时 SQL 绑定。
// 用例用它在运行时建表/删表/改数据，使「前置条件」自包含、可重入。
// 连接信息从根 .env 的 KATA_SR3X_URL 读取，不写进脚本。
//
// 通用多数据源工具在 lib/db；这里只是把本环境的连接固化成便捷函数。
import { type DataSourceType, withDb } from "../../../../../../../../lib/db";

const URL_ENV = "KATA_SR3X_URL";
const TYPE = (process.env.KATA_SR3X_TYPE ?? "starrocks") as DataSourceType;

function url(): string {
  const u = process.env[URL_ENV];
  if (!u) {
    throw new Error(
      `[_db] ${URL_ENV} 未设置——本用例需要运行时 SQL（建表/改数据）。请在根 .env 配置 ${URL_ENV}。`,
    );
  }
  return u;
}

/** Run setup/teardown SQL (DDL/DML, multi-statement OK) against the SR3.x datasource. */
export async function runSr3xSql(sql: string): Promise<void> {
  await withDb({ type: TYPE, url: url() }, (db) => db.exec(sql));
}

/** Query the SR3.x datasource and return rows (for asserting/deriving expected metrics). */
export async function querySr3x<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  return withDb({ type: TYPE, url: url() }, (db) => db.query<T>(sql));
}
