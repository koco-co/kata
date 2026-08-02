import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { buildSqlTempPath, resolveDtstackCliInvocation } from "../../src/adapters/execute-table";

describe("execute-table adapter", () => {
  test("uses a fixed temporary SQL filename instead of interpolating table names", () => {
    expect(buildSqlTempPath("/tmp/dtstack-exec-abc")).toBe("/tmp/dtstack-exec-abc/query.sql");
  });

  test("resolves a usable dtstack-cli invocation", () => {
    const invocation = resolveDtstackCliInvocation();

    if (existsSync("./node_modules/.bin/dtstack-cli")) {
      expect(invocation).toEqual({ command: "./node_modules/.bin/dtstack-cli", argsPrefix: [] });
    } else {
      expect(invocation).toEqual({
        command: "bun",
        argsPrefix: ["cli/packages/dtstack-sdk/src/cli.ts"],
      });
    }
  });
});
