import { afterEach, describe, expect, mock, test } from "bun:test";
import { DtStackClient, MAX_RETRY_ATTEMPTS } from "../../../src/core/http/client";

describe("DtStackClient", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("post sends JSON body and cookie header", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ code: 1, data: "ok" }))),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new DtStackClient({
      baseUrl: "http://example.test",
      cookie: "dt_token=abc",
    });

    const result = await client.post<string>("/api/echo", { foo: 1 });
    expect(result.code).toBe(1);
    const [url, opts] = (fetchMock as ReturnType<typeof mock>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("http://example.test/api/echo");
    expect((opts.headers as Record<string, string>).cookie).toBe("dt_token=abc");
    expect(JSON.parse(opts.body as string)).toEqual({ foo: 1 });
    // fetch 必须带 30s 超时信号，避免请求无限挂起
    expect(opts.signal).toBeInstanceOf(AbortSignal);
    expect(opts.signal?.aborted).toBe(false);
  });

  test("postWithProjectId sets X-Project-Id header", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ code: 1, data: null }))),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const client = new DtStackClient({ baseUrl: "http://x", cookie: "c" });
    await client.postWithProjectId("/api/p", {}, 42);
    const [, opts] = (fetchMock as ReturnType<typeof mock>).mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["X-Project-Id"]).toBe("42");
  });

  test("retries on 502/503/504 then throws", async () => {
    const fetchMock = mock(() => Promise.resolve(new Response("oops", { status: 502 })));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const origSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((fn: () => void) => {
      fn();
      return 0 as never;
    }) as never;
    try {
      const client = new DtStackClient({ baseUrl: "http://x", cookie: "c" });
      await expect(client.post("/api/x")).rejects.toThrow(/502/);
      expect(fetchMock.mock.calls.length).toBe(MAX_RETRY_ATTEMPTS);
    } finally {
      globalThis.setTimeout = origSetTimeout;
    }
  });

  test("network errors (fetch rejects) enter the retry loop", async () => {
    const fetchMock = mock(() => Promise.reject(new TypeError("fetch failed")));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const origSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((fn: () => void) => {
      fn();
      return 0 as never;
    }) as never;
    try {
      const client = new DtStackClient({ baseUrl: "http://x", cookie: "c" });
      await expect(client.post("/api/x")).rejects.toThrow(/fetch failed/);
      expect(fetchMock.mock.calls.length).toBe(MAX_RETRY_ATTEMPTS);
    } finally {
      globalThis.setTimeout = origSetTimeout;
    }
  });

  test("network error on first attempt is retried and can succeed later", async () => {
    let calls = 0;
    const fetchMock = mock(() => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new TypeError("fetch failed"))
        : Promise.resolve(new Response(JSON.stringify({ code: 1, data: "ok" })));
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const origSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((fn: () => void) => {
      fn();
      return 0 as never;
    }) as never;
    try {
      const client = new DtStackClient({ baseUrl: "http://x", cookie: "c" });
      const result = await client.post<string>("/api/x");
      expect(result.code).toBe(1);
      expect(calls).toBe(2);
    } finally {
      globalThis.setTimeout = origSetTimeout;
    }
  });

  test("non-retryable HTTP status throws immediately without retry", async () => {
    const fetchMock = mock(() => Promise.resolve(new Response("nope", { status: 401 })));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const client = new DtStackClient({ baseUrl: "http://x", cookie: "c" });
    await expect(client.post("/api/x")).rejects.toThrow(/401/);
    expect(fetchMock.mock.calls.length).toBe(1);
  });
});
