import type { DtStackCliConfig } from "../config/schema";
import type { Session } from "./login";

export interface ResolveSessionOptions {
  readonly env: string;
  readonly config: DtStackCliConfig;
  readonly doLogin: (baseUrl: string, username: string, password: string) => Promise<Session>;
}

const FAKE_USER = "external";

export async function resolveSession(opts: ResolveSessionOptions): Promise<Session> {
  const envCfg = opts.config.environments[opts.env];
  if (!envCfg) throw new Error(`unknown environment: ${opts.env}`);
  const configuredCookie = process.env.DTSTACK_COOKIE ?? envCfg.cookie;
  if (configuredCookie) {
    return {
      cookie: configuredCookie,
      user: FAKE_USER,
      tenantId: null,
      tenantName: null,
    };
  }

  const username = process.env.DTSTACK_USERNAME ?? envCfg.login?.username;
  const password = process.env.DTSTACK_PASSWORD ?? envCfg.login?.password;
  if (!username || !password) {
    throw new Error(
      "no credentials available for auto-login (configure auth.cookie in config/env or explicit DTSTACK_USERNAME/DTSTACK_PASSWORD)",
    );
  }
  const fresh = await opts.doLogin(envCfg.baseUrl, username, password);
  return fresh;
}
