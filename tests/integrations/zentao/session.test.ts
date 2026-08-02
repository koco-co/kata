import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  type FetchFn,
  fetchAuthedBugJson,
  isAuthedBugJson,
  zentaoConfigPath,
} from "../../../cli/integrations/zentao/session.ts";

const creds = { baseUrl: "http://zt.example", account: "u", password: "p" };
const validJson = JSON.stringify({ status: "success", data: JSON.stringify({ bug: { id: "1" } }) });

describe("isAuthedBugJson", () => {
  it("true for valid bug json", () => assert.equal(isAuthedBugJson(validJson), true));
  it("false for login redirect html", () =>
    assert.equal(isAuthedBugJson("<script>self.location='/zentao/user-login-x.html'"), false));
  it("false for status fail", () =>
    assert.equal(isAuthedBugJson(JSON.stringify({ status: "fail" })), false));
  it("false for non-json", () => assert.equal(isAuthedBugJson("oops"), false));
});

describe("zentaoConfigPath", () => {
  it("points to the local plugin config", () => {
    assert.ok(zentaoConfigPath().endsWith("/config/private/integrations/zentao.yaml"));
    assert.equal(zentaoConfigPath().includes("/.kata/"), false);
  });
});

describe("fetchAuthedBugJson", () => {
  it("reuses a valid cookie without logging in", async () => {
    const calls: string[] = [];
    const fetchFn: FetchFn = async (url) => {
      calls.push(url);
      return new Response(validJson, { status: 200 });
    };
    let wrote = false;
    const result = await fetchAuthedBugJson(1, creds, {
      fetchFn,
      readCookieFn: () => "zentaosid=good",
      writeCookieFn: () => {
        wrote = true;
      },
    });
    assert.equal(result.text, validJson);
    assert.equal(result.cookie, "zentaosid=good");
    assert.equal(wrote, false);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].includes("bug-view-1.json"));
    assert.ok(!calls.some((u) => u.includes("user-login")));
  });

  it("falls back to login when cookie is stale, then re-saves and returns the fresh cookie", async () => {
    const calls: string[] = [];
    const fetchFn: FetchFn = async (url) => {
      calls.push(url);
      if (url.includes("user-login")) {
        return new Response(JSON.stringify({ result: "success" }), {
          status: 200,
          headers: { "set-cookie": "zentaosid=fresh; path=/" },
        });
      }
      const loggedIn = calls.some((u) => u.includes("user-login"));
      return loggedIn
        ? new Response(validJson, { status: 200 })
        : new Response("<script>self.location='/zentao/user-login-x.html'</script>", {
            status: 200,
          });
    };
    let saved: string | null = null;
    const result = await fetchAuthedBugJson(1, creds, {
      fetchFn,
      readCookieFn: () => "zentaosid=stale",
      writeCookieFn: (c) => {
        saved = c;
      },
    });
    assert.equal(result.text, validJson);
    // 返回实际生效的新 cookie，调用方（附件下载）不应重读到过期值
    assert.equal(result.cookie, "zentaosid=fresh");
    assert.equal(saved, "zentaosid=fresh");
    assert.ok(calls.some((u) => u.includes("user-login")));
  });

  it("logs in directly when no cookie present", async () => {
    const fetchFn: FetchFn = async (url) =>
      url.includes("user-login")
        ? new Response("{}", { status: 200, headers: { "set-cookie": "zentaosid=fresh; path=/" } })
        : new Response(validJson, { status: 200 });
    let saved: string | null = null;
    const result = await fetchAuthedBugJson(1, creds, {
      fetchFn,
      readCookieFn: () => null,
      writeCookieFn: (c) => {
        saved = c;
      },
    });
    assert.equal(result.text, validJson);
    assert.equal(result.cookie, "zentaosid=fresh");
    assert.equal(saved, "zentaosid=fresh");
  });

  it("throws LOGIN_FAILED when login response lacks set-cookie", async () => {
    const fetchFn: FetchFn = async (url) =>
      url.includes("user-login")
        ? new Response("{}", { status: 200 })
        : new Response(validJson, { status: 200 });
    await assert.rejects(
      fetchAuthedBugJson(1, creds, { fetchFn, readCookieFn: () => null, writeCookieFn: () => {} }),
      (e: Error & { code?: string }) => e.code === "LOGIN_FAILED",
    );
  });

  it("fails clearly when a stale cookie cannot fall back to credentials", async () => {
    const cookieOnlyCreds = { baseUrl: "http://zt.example" };
    const fetchFn: FetchFn = async () =>
      new Response("<script>self.location='/zentao/user-login-x.html'</script>", { status: 200 });
    await assert.rejects(
      fetchAuthedBugJson(1, cookieOnlyCreds, {
        fetchFn,
        readCookieFn: () => "zentaosid=stale",
        writeCookieFn: () => {},
      }),
      (e: Error & { code?: string }) =>
        e.code === "ZENTAO_AUTH_MISSING" &&
        // 报错必须列出尝试过的 yaml 路径与补救动作（env 变量覆盖已移除）
        e.message.includes("config/private/integrations/zentao.yaml") &&
        e.message.includes("username/password"),
    );
  });
});
