import type { Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { getEnvConfig } from "../../../../../../../_shared/runtime/env-profile";
import { setupPreconditions } from "../../../../../../../_shared/helpers/preconditions";

const SOURCE_HASH = createHash("sha256")
  .update("2026-04-zi-chan-ji-cheng:universal-precond:v1")
  .digest("hex");

const ran = new Set<string>();

export async function runUniversalPrecond(page: Page): Promise<void> {
  const env = getEnvConfig();
  const datasource = env.datasources.doris;
  const batch = datasource.batch;
  if (!batch) {
    throw new Error(`[precond] doris batch datasource profile is required for env "${env.env}".`);
  }
  const key = `${env.env}:${batch.id}:${SOURCE_HASH}`;
  if (ran.has(key)) return;
  if (env.runtime.skipPreconditions) {
    process.stderr.write(`[precond] skipped by profile: ${env.env}\n`);
    ran.add(key);
    return;
  }
  if (env.runtime.allowWrite !== true) {
    throw new Error(`[precond] writes are disabled for dataAssets env "${env.env}".`);
  }
  await setupPreconditions(page, {
    projectName: env.projects.offline.name,
    projectId: env.projects.offline.id,
    datasourceType: datasource.preconditionType,
    datasourceProfile: {
      id: batch.id,
      name: batch.name,
      typeId: batch.typeId,
      aliases: datasource.aliases,
      database: batch.database,
      schema: batch.schema,
      metadata: datasource.metadata,
      assets: datasource.assets,
    },
    tables: [
      {
        name: `${env.runtime.tablePrefix}_profile_probe`,
        sql: `CREATE TABLE IF NOT EXISTS ${env.runtime.tablePrefix}_profile_probe (id INT);`,
      },
    ],
    syncTimeoutMs: env.runtime.timeouts.metadataSyncMs,
    autoCreate: false,
  });
  ran.add(key);
}
