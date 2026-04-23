/**
 * 前置条件 — 兼容层
 *
 * 支持两种调用：
 * - 新 SDK 形态：setupPreconditions({ client, project, datasource, tables })
 * - 历史形态：setupPreconditions(page, { projectName, datasourceType, tables })
 */

import type { Page } from "@playwright/test";
import {
  precondSetup,
  type DtStackClientLike,
  type PrecondDatasourceProfile,
  type PrecondSetupOptions,
  type PrecondSetupResult,
  type PrecondTable,
} from "dtstack-sdk";
import { createClientFromPage } from "dtstack-sdk/adapters/playwright";
import { getEnvConfig } from "../runtime/env-profile";

export type {
  DtStackClientLike,
  PrecondDatasourceProfile,
  PrecondSetupOptions,
  PrecondSetupResult,
  PrecondTable,
};
export { createClientFromPage as createClient } from "dtstack-sdk/adapters/playwright";

export interface LegacyPrecondOptions {
  readonly datasourceType: string;
  readonly projectName: string;
  readonly projectId?: number;
  readonly datasourceProfile?: PrecondDatasourceProfile;
  readonly database?: string;
  readonly tables: ReadonlyArray<PrecondTable>;
  readonly tablesFromFile?: string;
  readonly syncTimeoutMs?: number;
  readonly skipSync?: boolean;
  readonly autoCreate?: boolean;
}

function assertProfileAllowsWrites(): void {
  const env = getEnvConfig();
  if (env.runtime.allowWrite !== true) {
    throw new Error(
      `[precond] writes are disabled for dataAssets env "${env.env}" (runtime.allow_write must be true).`,
    );
  }
}

export function setupPreconditions(opts: PrecondSetupOptions): Promise<PrecondSetupResult>;
export function setupPreconditions(
  page: Page,
  opts: LegacyPrecondOptions,
): Promise<PrecondSetupResult>;
export async function setupPreconditions(
  first: Page | PrecondSetupOptions,
  second?: LegacyPrecondOptions,
): Promise<PrecondSetupResult> {
  assertProfileAllowsWrites();

  if (second) {
    const client = await createClientFromPage(first as Page);
    return precondSetup({
      client,
      project: second.projectName,
      projectId: second.projectId,
      datasource: second.datasourceType,
      datasourceProfile: second.datasourceProfile,
      database: second.database,
      tables: second.tables,
      tablesFromFile: second.tablesFromFile,
      syncTimeoutMs: second.syncTimeoutMs,
      skipSync: second.skipSync,
      autoCreate: second.autoCreate,
    });
  }

  return precondSetup(first as PrecondSetupOptions);
}
