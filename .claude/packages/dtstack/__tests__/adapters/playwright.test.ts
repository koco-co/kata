import { describe, expect, mock, test } from "bun:test";
import { createClientFromPage, extractCookieFromPage } from "../../src/adapters/playwright";

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
});
