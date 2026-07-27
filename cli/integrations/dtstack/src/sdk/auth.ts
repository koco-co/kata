import { performLogin, type Session } from "../core/auth/login";
import { resolveSession } from "../core/auth/resolve";
import type { DtStackCliConfig } from "../core/config/schema";

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

export async function getSession(env: string, config: DtStackCliConfig): Promise<Session> {
  return resolveSession({
    env,
    config,
    doLogin: (baseUrl, username, password) => performLogin({ baseUrl, username, password }),
  });
}
