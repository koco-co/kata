/**
 * 前置条件 — 兼容层
 * 从 dtstack-cli 重新导出，保持向后兼容
 *
 * 注意：dtstack-cli 的 precondSetup 接受单参数 { client, project, datasource, tables, ... }
 * 但所有现有调用者使用旧接口 (page, { datasourceType, projectName, tables, ... })。
 * 本文件提供适配器自动从 page 创建 client 并转换参数。
 */

import type { Page } from "@playwright/test";
import { precondSetup } from "dtstack-cli";
import { createClientFromPage } from "dtstack-cli/adapters/playwright";
import type {
  DtStackClientLike,
  PrecondSetupOptions,
  PrecondSetupResult,
  PrecondTable,
} from "dtstack-cli";

export type { DtStackClientLike, PrecondSetupOptions, PrecondSetupResult, PrecondTable };

/**
 * 旧接口兼容层：接受 (page, opts) 而非 ({ client, project, datasource, ... })。
 * 自动从 page 创建 BrowserDtStackClient 并映射参数名。
 */
export async function setupPreconditions(
  page: Page,
  opts: {
    readonly type?: "meta" | "non-meta";
    readonly datasourceType: string;
    readonly tables: ReadonlyArray<PrecondTable>;
    readonly projectName?: string;
    readonly syncTimeout?: number;
  },
): Promise<PrecondSetupResult> {
  const client = await createClientFromPage(page);
  return precondSetup({
    client,
    datasource: opts.datasourceType,
    project: opts.projectName ?? "",
    tables: opts.tables,
    syncTimeout: opts.syncTimeout,
  });
}

export { createClientFromPage as createClient } from "dtstack-cli/adapters/playwright";
