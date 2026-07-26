import { afterEach, describe, expect, mock, test } from "bun:test";
import { createClientFromPage, extractCookieFromPage } from "../../src/adapters/playwright";

const originalUrls = {
  KATA_DATAASSETS_RESOLVED: process.env.KATA_DATAASSETS_RESOLVED,
  UI_AUTOTEST_BASE_URL: process.env.UI_AUTOTEST_BASE_URL,
  E2E_BASE_URL: process.env.E2E_BASE_URL,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalUrls)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("playwright adapter", () => {
  test("extractCookieFromPage joins cookies", async () => {
    const page = {
      context: () => ({
        cookies: async () => [
          { name: "a", value: "1" },
          { name: "b", value: "2" },
        ],
      }),
    };
    const cookie = await extractCookieFromPage(page as never);
    expect(cookie).toBe("a=1; b=2");
  });

  test("createClientFromPage bootstraps origin if needed and returns client", async () => {
    const goto = mock(() => Promise.resolve(null));
    const cookies = mock(() => Promise.resolve([{ name: "SESSION", value: "x" }]));
    const page = {
      url: () => "about:blank",
      goto,
      context: () => ({
        cookies,
        request: {
          post: mock(async () => ({
            ok: () => true,
            status: () => 200,
            statusText: () => "OK",
            text: async () => "{}",
          })),
        },
      }),
    } as never;
    const client = await createClientFromPage(page, "http://x");
    await client.post("/api/test", {});
    expect(goto).toHaveBeenCalledTimes(1);
  });

  test("requires a configured base URL instead of using a hardcoded host", async () => {
    process.env.KATA_DATAASSETS_RESOLVED = JSON.stringify({ urls: { baseUrl: "http://x" } });
    delete process.env.UI_AUTOTEST_BASE_URL;
    delete process.env.E2E_BASE_URL;
    delete process.env.KATA_DATAASSETS_RESOLVED;
    await expect(createClientFromPage({} as never)).rejects.toThrow("kata env run");
  });
});
