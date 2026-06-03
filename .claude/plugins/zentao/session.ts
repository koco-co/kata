/**
 * plugins/zentao/session.ts — 禅道会话：cookie 优先复用，失效降级账号密码登录
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { repoRoot } from "@shared/lib/paths.ts";

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface ZentaoCreds {
  baseUrl: string;
  account: string;
  password: string;
}

export interface FetchAuthedOptions {
  fetchFn?: FetchFn;
  readCookieFn?: () => string | null;
  writeCookieFn?: (cookie: string) => void;
  refresh?: boolean;
}

// ─── cookie 持久化（仓库级共享，.gitignore 已忽略 .kata/）──────────────────────
/** Absolute path to the repo-level shared ZenTao session cookie file. */
export function cookiePath(): string {
  return join(repoRoot(), ".kata", "zentao", "session.json");
}

/** Read the persisted ZenTao session cookie, or null if absent/unreadable. */
export function readCookie(): string | null {
  try {
    const p = cookiePath();
    if (!existsSync(p)) return null;
    const parsed = JSON.parse(readFileSync(p, "utf8")) as { cookie?: string };
    return parsed.cookie ?? null;
  } catch {
    return null;
  }
}

/** Persist the ZenTao session cookie to the repo-level shared file. */
export function writeCookie(cookie: string): void {
  const p = cookiePath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify({ cookie }, null, 2), "utf8");
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

function parseSessionCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const parts = setCookie
    .split(",")
    .map((s) => s.split(";")[0].trim())
    .filter((s) => s.includes("="));
  return (
    parts.find((s) => s.startsWith("zentaosid=") || s.startsWith("PHPSESSID=")) ?? parts[0] ?? null
  );
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
  const url = `${creds.baseUrl}/zentao/user-login.json`;
  const body = `account=${encodeURIComponent(creds.account)}&password=${encodeURIComponent(creds.password)}`;
  const res = await safeFetch(fetchFn, url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  if (!res.ok) {
    throw Object.assign(new Error(`禅道登录失败，HTTP ${res.status}`), { code: "LOGIN_FAILED" });
  }
  const cookie = parseSessionCookie(
    res.headers.getSetCookie?.().join(", ") ?? res.headers.get("set-cookie"),
  );
  if (!cookie) {
    throw Object.assign(new Error("禅道登录失败：无法解析 Session Cookie"), {
      code: "LOGIN_FAILED",
    });
  }
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
