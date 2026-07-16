import { afterEach, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { resolveSessionFile } from "../../src/sdk/auth";

const original = process.env.KATA_DTSTACK_SESSION_PATH;

afterEach(() => {
  if (original === undefined) delete process.env.KATA_DTSTACK_SESSION_PATH;
  else process.env.KATA_DTSTACK_SESSION_PATH = original;
});

describe("dtstack session storage", () => {
  test("uses the unified environment variable", () => {
    process.env.KATA_DTSTACK_SESSION_PATH = "runtime/dtstack-session.json";
    expect(resolveSessionFile()).toBe(resolve("runtime/dtstack-session.json"));
  });

  test("does not silently create a hardcoded user-home session", () => {
    delete process.env.KATA_DTSTACK_SESSION_PATH;
    expect(() => resolveSessionFile()).toThrow("KATA_DTSTACK_SESSION_PATH is required");
  });
});
