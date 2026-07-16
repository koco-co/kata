import { join } from "node:path";
import { setDotEnvValue } from "@shared/lib/env.ts";
import { repoRoot } from "@shared/lib/paths.ts";

export interface RootEnvSetContext {
  readonly key: string;
  readonly value: string;
  readonly repoRoot?: string;
}

/** Set a root dotenv key while keeping the configured value out of JSON output. */
export function setRootEnv(ctx: RootEnvSetContext): {
  envPath: string;
  key: string;
  configured: true;
} {
  const root = ctx.repoRoot ?? repoRoot();
  const envPath = join(root, ".env");
  setDotEnvValue(envPath, ctx.key, ctx.value);
  return { envPath, key: ctx.key, configured: true };
}
