# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/runners/smoke.spec.ts >> 【P3】资产盘点元数据变化与资产查询趋势图可核验
- Location: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/cases/t10-assets-inventory-trends.ts:29:1

# Error details

```
TypeError: Cannot read properties of undefined (reading 'startsWith')
```

# Test source

```ts
  1  | // env-setup.ts — split from test-setup.ts
  2  | 
  3  | import type { Page } from "@playwright/test";
  4  | import { getEnvConfig } from "../runtime/env-profile";
  5  | 
  6  | type RuntimeEnv = Record<string, string | undefined>;
  7  | type ProjectListResponse = { data?: Array<{ id?: number | string }> };
  8  | 
  9  | export function getEnv(name: string): string | undefined {
  10 |   return (globalThis as typeof globalThis & { process?: { env?: RuntimeEnv } }).process?.env?.[
  11 |     name
  12 |   ];
  13 | }
  14 | 
  15 | function getRawBaseUrl(): string {
  16 |   return getEnv("UI_AUTOTEST_BASE_URL") ?? getEnv("E2E_BASE_URL") ?? "";
  17 | }
  18 | 
  19 | export function normalizeBaseUrl(product: string): string {
  20 |   const rawBaseUrl = getRawBaseUrl();
  21 |   const parsed = new URL(rawBaseUrl);
  22 |   const cleanPath = parsed.pathname.replace(/\/$/, "");
  23 |   const productIndex = cleanPath.indexOf(`/${product}`);
  24 |   const productPath =
  25 |     productIndex >= 0
  26 |       ? cleanPath.slice(0, productIndex + `/${product}`.length)
  27 |       : `${cleanPath}/${product}`.replace(/\/{2,}/g, "/");
  28 |   return `${parsed.origin}${productPath || `/${product}`}`;
  29 | }
  30 | 
  31 | export function normalizeDataAssetsBaseUrl(): string {
  32 |   return getEnvConfig().urls.dataAssetsBaseUrl;
  33 | }
  34 | 
  35 | export function normalizeDataAssetsApiBaseUrl(baseUrl = getEnvConfig().urls.baseUrl): string {
  36 |   const parsed = new URL(baseUrl);
  37 |   const cleanPath = parsed.pathname.replace(/\/$/, "");
  38 |   const productIndex = cleanPath.indexOf("/dataAssets");
  39 |   const apiPath = productIndex >= 0 ? cleanPath.slice(0, productIndex) : cleanPath;
  40 |   return `${parsed.origin}${apiPath}`;
  41 | }
  42 | 
  43 | export function buildDataAssetsApiUrl(path: string, baseUrl?: string): string {
> 44 |   const normalizedPath = path.startsWith("/") ? path : `/${path}`;
     |                               ^ TypeError: Cannot read properties of undefined (reading 'startsWith')
  45 |   return `${normalizeDataAssetsApiBaseUrl(baseUrl)}${normalizedPath}`;
  46 | }
  47 | 
  48 | export function normalizeOfflineBaseUrl(): string {
  49 |   return getEnvConfig().urls.offlineBaseUrl;
  50 | }
  51 | 
  52 | export function buildDataAssetsUrl(path: string, pid?: number | string): string {
  53 |   const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  54 |   const separator = normalizedPath.includes("?") ? "&" : "?";
  55 |   const hashPath = pid ? `${normalizedPath}${separator}pid=${pid}` : normalizedPath;
  56 |   return `${normalizeDataAssetsBaseUrl()}/#${hashPath}`;
  57 | }
  58 | 
  59 | export function buildOfflineUrl(path: string): string {
  60 |   const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  61 |   return `${normalizeOfflineBaseUrl()}/#${normalizedPath}`;
  62 | }
  63 | 
  64 | export async function applyRuntimeCookies(page: Page, product = "dataAssets"): Promise<void> {
  65 |   const runtimeCookie = getEnv("UI_AUTOTEST_COOKIE")?.trim();
  66 |   if (!runtimeCookie) return;
  67 | 
  68 |   const cookieUrl = normalizeBaseUrl(product);
  69 |   const cookieMap = new Map<string, string>();
  70 |   for (const pair of runtimeCookie.split(/;\s*/)) {
  71 |     if (!pair) continue;
  72 |     const separatorIndex = pair.indexOf("=");
  73 |     if (separatorIndex <= 0) continue;
  74 |     const name = pair.slice(0, separatorIndex).trim();
  75 |     const value = pair.slice(separatorIndex + 1).trim();
  76 |     if (!name) continue;
  77 |     cookieMap.set(name, value);
  78 |   }
  79 | 
  80 |   const baseUrl = getRawBaseUrl();
  81 |   await page.context().addCookies(
  82 |     Array.from(cookieMap.entries()).map(([name, value]) => ({
  83 |       name,
  84 |       value,
  85 |       url: baseUrl,
  86 |     })),
  87 |   );
  88 | 
  89 |   if (cookieUrl !== baseUrl) {
  90 |     await page.context().addCookies(
  91 |       Array.from(cookieMap.entries()).map(([name, value]) => ({
  92 |         name,
  93 |         value,
  94 |         url: cookieUrl,
  95 |       })),
  96 |     );
  97 |   }
  98 | }
  99 | 
```