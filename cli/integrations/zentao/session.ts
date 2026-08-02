/**
 * cli/integrations/zentao/session.ts — 禅道会话：cookie 优先复用，失效降级账号密码登录
 */

import { loadZentaoConfig, pluginConfigPath, updatePluginConfig } from "../../lib/plugin-config.ts";
import { repoRoot } from "../../lib/workspace-locator.ts";
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

export interface AuthedBugJson {
  /** Raw bug .json response text. */
  text: string;
  /** Cookie that actually authenticated this fetch (probed existing or freshly logged in). */
  cookie: string;
}

// ─── cookie 持久化（本机 config/private/integrations/zentao.yaml）──────────────
/** Absolute path to the local ZenTao plugin config file. */
export function zentaoConfigPath(): string {
  return pluginConfigPath("zentao", repoRoot());
}

/** Read the ZenTao cookie from the local private plugin config. */
export function readCookie(): string | null {
  return loadZentaoConfig().cookie?.trim() || null;
}

/** Persist a refreshed ZenTao cookie to the local plugin config. */
export function writeCookie(cookie: string): void {
  updatePluginConfig("zentao", { cookie });
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
        `禅道 cookie 已失效，且缺少账号密码，无法重新登录；请在 ${zentaoConfigPath()} 配置 username/password`,
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
 * Returns the cookie that actually authenticated the fetch so callers (e.g.
 * attachment download) can reuse it instead of re-reading possibly stale config.
 */
export async function fetchAuthedBugJson(
  bugId: number,
  creds: ZentaoCreds,
  opts: FetchAuthedOptions = {},
): Promise<AuthedBugJson> {
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
        if (res.ok && isAuthedBugJson(text)) return { text, cookie: existing };
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
  return { text: await res.text(), cookie };
}
