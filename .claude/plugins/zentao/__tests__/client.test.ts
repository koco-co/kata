import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSessionCookie } from "../client.ts";

describe("parseSessionCookie", () => {
  it("picks zentaosid from Set-Cookie", () => {
    assert.equal(
      parseSessionCookie("zentaosid=abc123; path=/, other=x; path=/"),
      "zentaosid=abc123",
    );
  });
  it("picks PHPSESSID when zentaosid absent", () => {
    assert.equal(parseSessionCookie("PHPSESSID=xyz; path=/"), "PHPSESSID=xyz");
  });
  it("falls back to first cookie pair", () => {
    assert.equal(parseSessionCookie("foo=bar; path=/"), "foo=bar");
  });
  it("returns null for null/empty", () => {
    assert.equal(parseSessionCookie(null), null);
    assert.equal(parseSessionCookie(""), null);
  });
});
