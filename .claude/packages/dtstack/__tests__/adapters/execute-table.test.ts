import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolveDtstackCliInvocation } from "../../src/adapters/execute-table";

describe("execute-table adapter", () => {
  test("resolves a usable dtstack-cli invocation", () => {
    const invocation = resolveDtstackCliInvocation();

    if (existsSync("./node_modules/.bin/dtstack-cli")) {
      expect(invocation).toEqual({ command: "./node_modules/.bin/dtstack-cli", argsPrefix: [] });
    } else {
      expect(invocation).toEqual({
        command: "bun",
        argsPrefix: [".claude/packages/dtstack/src/cli.ts"],
      });
    }
  });
});
