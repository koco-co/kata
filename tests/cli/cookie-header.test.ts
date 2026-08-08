import { describe, expect, test } from "bun:test";
import { parseCookieHeader } from "../../cli/lib/cookie-header.ts";

describe("strict platform Cookie header contract", () => {
  test.each([
    ["alpha=one", [{ name: "alpha", value: "one" }]],
    [
      "alpha=one; beta=two=2; empty=",
      [
        { name: "alpha", value: "one" },
        { name: "beta", value: "two=2" },
        { name: "empty", value: "" },
      ],
    ],
    [
      'alpha="quoted";empty=""',
      [
        { name: "alpha", value: "quoted" },
        { name: "empty", value: "" },
      ],
    ],
    ["encoded=tenant%2Da", [{ name: "encoded", value: "tenant%2Da" }]],
  ])("accepts RFC 6265 cookie pairs without decoding: %s", (header, expected) => {
    expect(parseCookieHeader(header)).toEqual(expected);
  });

  test.each([
    "alpha=one;alpha=two",
    " alpha=one",
    "alpha=one ",
    "alpha=one;  beta=two",
    "alpha=one;\tbeta=two",
    "alpha=one\nbeta=two",
    "alpha=one;;beta=two",
    "alpha=one;",
    "alpha =one",
    "alpha=one,beta=two",
    'alpha="unterminated',
    'alpha=embedded"quote',
    'alpha="escaped\\value"',
    "alpha=反例",
  ])("rejects ambiguous or invalid syntax without echoing it: %s", (header) => {
    let message = "";
    try {
      parseCookieHeader(header);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("AUTH_COOKIE_INVALID");
    expect(message).not.toContain(header);
  });

  test("rejects an oversized header", () => {
    expect(() => parseCookieHeader(`alpha=${"a".repeat(64 * 1024)}`)).toThrow(
      "AUTH_COOKIE_INVALID",
    );
  });
});
