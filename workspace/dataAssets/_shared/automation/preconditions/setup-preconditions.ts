import {
  precondSetup,
  type DtStackClientLike,
  type PrecondDatasourceProfile,
  type PrecondSetupOptions,
  type PrecondSetupResult,
  type PrecondTable,
} from "dtstack-sdk";
import { getEnvConfig } from "../runtime/env-profile";

export type {
  DtStackClientLike,
  PrecondDatasourceProfile,
  PrecondSetupOptions,
  PrecondSetupResult,
  PrecondTable,
};
export { createClientFromPage as createClient } from "dtstack-sdk/adapters/playwright";

function assertProfileAllowsWrites(): void {
  const env = getEnvConfig();
  if (env.runtime.allowWrite !== true) {
    throw new Error(
      `[precond] writes are disabled for dataAssets env "${env.env}" (runtime.allow_write must be true).`,
    );
  }
}

export async function setupPreconditions(
  options: PrecondSetupOptions,
): Promise<PrecondSetupResult> {
  assertProfileAllowsWrites();
  return precondSetup(options);
}
