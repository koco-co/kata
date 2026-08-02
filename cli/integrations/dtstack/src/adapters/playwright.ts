import type { Page } from "@playwright/test";
import {
  type DtStackClientLike,
  type DtStackResponse,
  FETCH_TIMEOUT_MS,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS,
  RETRYABLE_HTTP_STATUS,
} from "../core/http/client";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class BrowserDtStackClient implements DtStackClientLike {
  private readonly baseUrl: string;

  constructor(
    private readonly page: Page,
    opts: { baseUrl: string },
  ) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
  }

  async post<T = unknown>(
    path: string,
    data?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<DtStackResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
      const response = await this.page.context().request.post(url, {
        data,
        failOnStatusCode: false,
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "Accept-Language": "zh-CN",
          ...extraHeaders,
        },
        timeout: FETCH_TIMEOUT_MS,
      });
      const text = await response.text();
      if (response.ok())
        return text.trim() ? (JSON.parse(text) as DtStackResponse<T>) : ({} as DtStackResponse<T>);
      lastError = new Error(`HTTP ${response.status()} ${response.statusText()}: ${text}`);
      if (!RETRYABLE_HTTP_STATUS.has(response.status()) || attempt === MAX_RETRY_ATTEMPTS)
        throw lastError;
      await sleep(RETRY_DELAY_MS * attempt);
    }
    throw lastError ?? new Error(`request failed: ${url}`);
  }

  async postWithProjectId<T = unknown>(
    path: string,
    data: unknown,
    projectId: number,
  ): Promise<DtStackResponse<T>> {
    return this.post<T>(path, data, { "X-Project-Id": String(projectId) });
  }
}

export function extractCookieFromPage(page: Pick<Page, "context">): Promise<string> {
  return page
    .context()
    .cookies()
    .then((cookies) => cookies.map((c) => `${c.name}=${c.value}`).join("; "));
}

export async function createClientFromPage(
  page: Page,
  baseUrl?: string,
): Promise<DtStackClientLike> {
  let kataBaseUrl: string | undefined;
  const resolvedRuntime = process.env.KATA_ACTIVE_ENV_RESOLVED;
  if (resolvedRuntime) {
    try {
      kataBaseUrl = (JSON.parse(resolvedRuntime) as { urls?: { baseUrl?: string } }).urls?.baseUrl;
    } catch {
      throw new Error("KATA_ACTIVE_ENV_RESOLVED is invalid JSON");
    }
  }
  const targetBaseUrl = baseUrl ?? kataBaseUrl;
  if (!targetBaseUrl) {
    throw new Error(
      "DTStack base URL is required; run Playwright through `kata env run <env> -- ...` or pass baseUrl",
    );
  }
  const targetOrigin = new URL(targetBaseUrl).origin;
  const currentUrl = page.url();
  const needBootstrap =
    currentUrl === "about:blank" ||
    (() => {
      try {
        return new URL(currentUrl).origin !== targetOrigin;
      } catch {
        return true;
      }
    })();

  if (needBootstrap) {
    await page.goto(new URL("/dataAssets/#/dataStandard", targetBaseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
  }
  return new BrowserDtStackClient(page, { baseUrl: targetBaseUrl });
}
