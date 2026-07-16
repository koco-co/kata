/**
 * plugins/zentao/session.ts — 禅道会话：cookie 优先复用，失效降级账号密码登录
 */
import { join } from "node:path";
import { getEnv, setDotEnvValue } from "@shared/lib/env.ts";
import { repoRoot } from "@shared/lib/paths.ts";
import { type FetchFn, zentaoLogin } from "./client.ts";

export type { FetchFn };

export interface ZentaoCreds {
  baseUrl: string;
  account?: string;
  password?: string;
}

export interface FetchAuthedOptions {
  fetchFn?: FetchFn;
  readCookieFn?: () => string | null;
  writeCookieFn?: (cookie: string) => void;
  refresh?: boolean;
}

// ─── cookie 持久化（统一根目录 .env）─────────────────────────────────────────
/** Absolute path to the unified project environment file. */
export function zentaoEnvPath(): string {
  return join(repoRoot(), ".env");
}

/** Read the ZenTao cookie from KATA_ZENTAO_COOKIE. */
export function readCookie(): string | null {
  return getEnv("KATA_ZENTAO_COOKIE")?.trim() || null;
}

/** Persist a refreshed ZenTao cookie to the unified root .env file. */
export function writeCookie(cookie: string): void {
  setDotEnvValue(zentaoEnvPath(), "KATA_ZENTAO_COOKIE", cookie);
}

// ─── 探活与登录 ───────────────────────────────────────────────────────────────
/** Whether a bug-view .json fetch result represents an authenticated, valid response. */
export function isAuthedBugJson(text: string): boolean {
  if (/self\.location=|user-login/.test(text)) return false;
  try {
    const j = JSON.parse(text) as { status?: string; data?: unknown; bug?: unknown };
    if (j.status === "fail") return false;
    return j.data !== undefined || j.bug !== undefined;
  } catch {
    return false;
  }
}

async function safeFetch(fetchFn: FetchFn, url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetchFn(url, init);
  } catch (err) {
    throw Object.assign(new Error(`网络连接失败: ${(err as Error).message}`), {
      code: "NETWORK_ERROR",
    });
  }
}

/** Log in with plaintext credentials and return the session cookie string. */
export async function login(creds: ZentaoCreds, fetchFn: FetchFn): Promise<string> {
  if (!creds.account || !creds.password) {
    throw Object.assign(
      new Error(
        "禅道 cookie 已失效，且缺少 KATA_ZENTAO_ACCOUNT/KATA_ZENTAO_PASSWORD，无法重新登录",
      ),
      { code: "ZENTAO_AUTH_MISSING" },
    );
  }
  // 登录与 cookie 解析复用 client.ts 的 zentaoLogin（含 JSON body 回退）
  const { cookie } = await zentaoLogin(creds.baseUrl, creds.account, creds.password, fetchFn);
  return cookie;
}

function bugJsonUrl(baseUrl: string, bugId: number): string {
  return `${baseUrl}/zentao/bug-view-${bugId}.json`;
}

/**
 * Fetch a bug's raw .json text, preferring a reused cookie and falling back to
 * plaintext login (re-saving the fresh cookie) when the cookie is missing/stale.
 */
export async function fetchAuthedBugJson(
  bugId: number,
  creds: ZentaoCreds,
  opts: FetchAuthedOptions = {},
): Promise<string> {
  const fetchFn = opts.fetchFn ?? (globalThis.fetch as FetchFn);
  const readFn = opts.readCookieFn ?? readCookie;
  const writeFn = opts.writeCookieFn ?? writeCookie;

  // 1. cookie 优先 + 探活（任何异常都视为失效，落到登录）
  if (!opts.refresh) {
    const existing = readFn();
    if (existing) {
      try {
        const res = await safeFetch(fetchFn, bugJsonUrl(creds.baseUrl, bugId), {
          headers: { Cookie: existing, Accept: "application/json" },
        });
        const text = await res.text();
        if (res.ok && isAuthedBugJson(text)) return text;
      } catch {
        // 探活失败，继续登录
      }
    }
  }

  // 2. 降级登录并回存
  const cookie = await login(creds, fetchFn);
  writeFn(cookie);

  // 3. 重抓
  const res = await safeFetch(fetchFn, bugJsonUrl(creds.baseUrl, bugId), {
    headers: { Cookie: cookie, Accept: "application/json" },
  });
  if (res.status === 404) {
    throw Object.assign(new Error(`Bug #${bugId} 不存在`), { code: "BUG_NOT_FOUND" });
  }
  if (!res.ok) {
    throw Object.assign(new Error(`获取 Bug 失败，HTTP ${res.status}`), { code: "FETCH_FAILED" });
  }
  return res.text();
}
