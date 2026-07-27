// env-setup.ts — split from test-setup.ts

import type { Page } from "@playwright/test";
import { getEnvConfig } from "../runtime/env-profile";

type RuntimeEnv = Record<string, string | undefined>;

export function getEnv(name: string): string | undefined {
  return (globalThis as typeof globalThis & { process?: { env?: RuntimeEnv } }).process?.env?.[
    name
  ];
}

function getRawBaseUrl(): string {
  return getEnv("UI_AUTOTEST_BASE_URL") ?? getEnv("E2E_BASE_URL") ?? "";
}

export function normalizeBaseUrl(product: string): string {
  const rawBaseUrl = getRawBaseUrl();
  const parsed = new URL(rawBaseUrl);
  const cleanPath = parsed.pathname.replace(/\/$/, "");
  const productIndex = cleanPath.indexOf(`/${product}`);
  const productPath =
    productIndex >= 0
      ? cleanPath.slice(0, productIndex + `/${product}`.length)
      : `${cleanPath}/${product}`.replace(/\/{2,}/g, "/");
  return `${parsed.origin}${productPath || `/${product}`}`;
}

export function normalizeDataAssetsBaseUrl(): string {
  return getEnvConfig().urls.dataAssetsBaseUrl;
}

export function normalizeDataAssetsApiBaseUrl(baseUrl = getEnvConfig().urls.baseUrl): string {
  const parsed = new URL(baseUrl);
  const cleanPath = parsed.pathname.replace(/\/$/, "");
  const productIndex = cleanPath.indexOf("/dataAssets");
  const apiPath = productIndex >= 0 ? cleanPath.slice(0, productIndex) : cleanPath;
  return `${parsed.origin}${apiPath}`;
}

export function buildDataAssetsApiUrl(path: string, baseUrl?: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeDataAssetsApiBaseUrl(baseUrl)}${normalizedPath}`;
}

export function normalizeOfflineBaseUrl(): string {
  return getEnvConfig().urls.offlineBaseUrl;
}

export function buildDataAssetsUrl(path: string, pid?: number | string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const separator = normalizedPath.includes("?") ? "&" : "?";
  const hashPath = pid ? `${normalizedPath}${separator}pid=${pid}` : normalizedPath;
  return `${normalizeDataAssetsBaseUrl()}/#${hashPath}`;
}

export function buildOfflineUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeOfflineBaseUrl()}/#${normalizedPath}`;
}

export async function applyRuntimeCookies(page: Page, product = "dataAssets"): Promise<void> {
  const runtimeCookie = getEnv("UI_AUTOTEST_COOKIE")?.trim();
  if (!runtimeCookie) return;

  const cookieUrl = normalizeBaseUrl(product);
  const cookieMap = new Map<string, string>();
  for (const pair of runtimeCookie.split(/;\s*/)) {
    if (!pair) continue;
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex <= 0) continue;
    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!name) continue;
    cookieMap.set(name, value);
  }

  const baseUrl = getRawBaseUrl();
  await page.context().addCookies(
    Array.from(cookieMap.entries()).map(([name, value]) => ({
      name,
      value,
      url: baseUrl,
    })),
  );

  if (cookieUrl !== baseUrl) {
    await page.context().addCookies(
      Array.from(cookieMap.entries()).map(([name, value]) => ({
        name,
        value,
        url: cookieUrl,
      })),
    );
  }
}
