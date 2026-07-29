// env-setup.ts — split from test-setup.ts

import type { Page } from "@playwright/test";
import { getEnvConfig } from "../runtime/env-profile";

function getRawBaseUrl(): string {
  return getEnvConfig().urls.baseUrl;
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
  const profile = getEnvConfig();
  const runtimeCookie = profile.auth.cookie.trim();
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

  const baseUrl = profile.urls.baseUrl;
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
