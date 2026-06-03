/**
 * plugins/zentao/client.ts — 禅道 HTTP 会话工具（登录 + cookie 解析 + 会话回退）
 * fetch.ts 与 create.ts 共用。
 */
import { getEnv } from "@shared/lib/env.ts";

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

/** Log in to ZenTao with account + password; returns a session cookie. */
export async function zentaoLogin(
  baseUrl: string,
  account: string,
  password: string,
): Promise<LoginResult> {
  const loginUrl = `${baseUrl}/zentao/user-login.json`;
  const body = `account=${encodeURIComponent(account)}&password=${encodeURIComponent(password)}`;
  let response: Response;
  try {
    response = await fetch(loginUrl, {
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
  const cookie = parseSessionCookie(response.headers.get("set-cookie"));
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
 * fall back to KATA_ZENTAO_COOKIE when login fails or creds are absent.
 */
export async function resolveSession(): Promise<string> {
  const baseUrl = getEnv("KATA_ZENTAO_BASE_URL");
  const account = getEnv("KATA_ZENTAO_ACCOUNT");
  const password = getEnv("KATA_ZENTAO_PASSWORD");
  const fallback = getEnv("KATA_ZENTAO_COOKIE");
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
    new Error("缺少禅道凭据：请配置 KATA_ZENTAO_ACCOUNT/PASSWORD 或 KATA_ZENTAO_COOKIE"),
    { code: "NO_CREDENTIALS" },
  );
}
