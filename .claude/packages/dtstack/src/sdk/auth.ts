import { resolve } from "node:path";
import { performLogin, type Session } from "../core/auth/login";
import { resolveSession } from "../core/auth/resolve";
import { SessionStore } from "../core/auth/session-store";
import type { DtStackCliConfig } from "../core/config/schema";

export function resolveSessionFile(): string {
  const configured = process.env.KATA_DTSTACK_SESSION_PATH?.trim();
  if (!configured) {
    throw new Error(
      "KATA_DTSTACK_SESSION_PATH is required; configure it in the kata root .env file",
    );
  }
  return resolve(configured);
}

export interface LoginOptions {
  readonly env: string;
  readonly config: DtStackCliConfig;
  readonly username?: string;
  readonly password?: string;
}

export async function login(opts: LoginOptions): Promise<Session> {
  const envCfg = opts.config.environments[opts.env];
  if (!envCfg) throw new Error(`unknown environment: ${opts.env}`);
  const username = opts.username ?? envCfg.login?.username ?? process.env.DTSTACK_USERNAME;
  const password = opts.password ?? envCfg.login?.password ?? process.env.DTSTACK_PASSWORD;
  if (!username || !password) throw new Error("username and password required");
  const session = await performLogin({ baseUrl: envCfg.baseUrl, username, password });
  await new SessionStore(resolveSessionFile()).save(opts.env, session);
  return session;
}

export async function whoami(env: string): Promise<Session | null> {
  return new SessionStore(resolveSessionFile()).load(env);
}

export async function logout(env: string): Promise<void> {
  await new SessionStore(resolveSessionFile()).clear(env);
}

export async function getSession(env: string, config: DtStackCliConfig): Promise<Session> {
  const store = new SessionStore(resolveSessionFile());
  return resolveSession({
    env,
    config,
    store,
    doLogin: (baseUrl, username, password) => performLogin({ baseUrl, username, password }),
  });
}
