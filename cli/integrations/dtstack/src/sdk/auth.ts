import { performLogin, type Session } from "../core/auth/login";
import { resolveSession } from "../core/auth/resolve";
import type { DtStackCliConfig } from "../core/config/schema";

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
  return performLogin({ baseUrl: envCfg.baseUrl, username, password });
}

export async function whoami(env: string, config: DtStackCliConfig): Promise<Session | null> {
  const envCfg = config.environments[env];
  if (!envCfg) throw new Error(`unknown environment: ${env}`);
  if (!envCfg.cookie && !process.env.DTSTACK_COOKIE) return null;
  return resolveSession({
    env,
    config,
    doLogin: (baseUrl, username, password) => performLogin({ baseUrl, username, password }),
  });
}

export async function logout(_env: string): Promise<void> {}

export async function getSession(env: string, config: DtStackCliConfig): Promise<Session> {
  return resolveSession({
    env,
    config,
    doLogin: (baseUrl, username, password) => performLogin({ baseUrl, username, password }),
  });
}
