import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { setDotEnvValue } from "@shared/lib/env.ts";
import { repoRoot } from "@shared/lib/paths.ts";

export interface ZentaoSessionMigrationContext {
  readonly session: string;
  readonly repoRoot?: string;
}

export interface RootEnvSetContext {
  readonly key: string;
  readonly value: string;
  readonly repoRoot?: string;
}

/** Migrate the legacy repo .kata ZenTao cookie into the unified root .env file. */
export function migrateZentaoSession(ctx: ZentaoSessionMigrationContext): {
  envPath: string;
  sessionPath: string;
  cookieConfigured: true;
} {
  const root = ctx.repoRoot ?? repoRoot();
  const envPath = join(root, ".env");
  const sessionPath = isAbsolute(ctx.session) ? ctx.session : resolve(root, ctx.session);
  if (!existsSync(sessionPath)) throw new Error(`ZenTao session not found: ${sessionPath}`);

  let session: { cookie?: unknown };
  try {
    session = JSON.parse(readFileSync(sessionPath, "utf8")) as { cookie?: unknown };
  } catch {
    throw new Error(`invalid ZenTao session JSON: ${sessionPath}`);
  }
  if (typeof session.cookie !== "string" || session.cookie.trim() === "") {
    throw new Error(`ZenTao cookie is missing in ${sessionPath}`);
  }
  setDotEnvValue(envPath, "KATA_ZENTAO_COOKIE", session.cookie);
  return { envPath, sessionPath, cookieConfigured: true };
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
