/**
 * cli/integrations/zentao/client.ts — 禅道 HTTP 会话原语（登录 + cookie 解析 + 会话回退）
 * create.ts 直接用；fetch.ts 经 session.ts 复用登录与 cookie 解析。
 */
import { repoRoot } from "../../lib/paths.ts";
import { loadZentaoConfig, pluginConfigPath } from "../../lib/plugin-config.ts";

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface LoginResult {
  cookie: string;
}

/** Parse the session cookie (zentaosid/PHPSESSID) from a Set-Cookie header. */
export function parseSessionCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const parts = setCookie
    .split(",")
    .map((s) => s.split(";")[0].trim())
    .filter((s) => s.includes("="));
  return (
    parts.find((s) => s.startsWith("zentaosid=") || s.startsWith("PHPSESSID=")) ?? parts[0] ?? null
  );
}

/**
 * Log in to ZenTao with account + password; returns a session cookie.
 * `fetchFn` is injectable so the cookie-first session layer (session.ts) and
 * tests can drive login without touching the global fetch.
 */
export async function zentaoLogin(
  baseUrl: string,
  account: string,
  password: string,
  fetchFn: FetchFn = globalThis.fetch as FetchFn,
): Promise<LoginResult> {
  const loginUrl = `${baseUrl}/zentao/user-login.json`;
  const body = `account=${encodeURIComponent(account)}&password=${encodeURIComponent(password)}`;
  let response: Response;
  try {
    response = await fetchFn(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "kata/2.0 zentao-plugin",
        Accept: "application/json",
      },
      body,
    });
  } catch (err) {
    throw Object.assign(new Error(`网络连接失败: ${(err as Error).message}`), {
      code: "NETWORK_ERROR",
    });
  }
  if (!response.ok) {
    throw Object.assign(new Error(`禅道登录失败，HTTP ${response.status}`), {
      code: "LOGIN_FAILED",
    });
  }
  const cookie = parseSessionCookie(
    response.headers.getSetCookie?.().join(", ") ?? response.headers.get("set-cookie"),
  );
  if (cookie) return { cookie };
  // 部分禅道版本把 token 放在 JSON body
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    // ignore
  }
  const b = parsed as Record<string, unknown> | undefined;
  const sid = b?.sessionID ?? b?.token ?? b?.sid;
  if (sid !== undefined && sid !== null && sid !== "") {
    return { cookie: `zentaosid=${String(sid)}` };
  }
  throw Object.assign(
    new Error(
      "禅道登录失败：响应中没有 Set-Cookie 头，也未在 JSON 响应体中找到 sessionID/token/sid",
    ),
    { code: "LOGIN_FAILED" },
  );
}

/**
 * Resolve a usable session cookie: account/password login first,
 * fall back to the configured plugin cookie when login fails or creds are absent.
 */
export async function resolveSession(): Promise<string> {
  const config = loadZentaoConfig();
  const baseUrl = config.base_url;
  const account = config.username;
  const password = config.password;
  const fallback = config.cookie;
  if (baseUrl && account && password) {
    try {
      const { cookie } = await zentaoLogin(baseUrl, account, password);
      return cookie;
    } catch (err) {
      if (fallback) return fallback;
      throw err;
    }
  }
  if (fallback) return fallback;
  throw Object.assign(
    new Error(
      `缺少禅道凭据：请在 ${pluginConfigPath("zentao", repoRoot())} 配置 username/password 或 cookie，` +
        "或设置环境变量 KATA_ZENTAO_ACCOUNT / KATA_ZENTAO_PASSWORD / KATA_ZENTAO_COOKIE",
    ),
    { code: "NO_CREDENTIALS" },
  );
}
