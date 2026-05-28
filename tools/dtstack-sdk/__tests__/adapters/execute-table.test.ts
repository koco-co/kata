import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import {
  resolveDtstackCliInvocation,
  resolveExecuteTableDefaults,
} from "../../src/adapters/execute-table";

const ENV_KEYS = [
  "KATA_DATAASSETS_PROJECT_ID",
  "KATA_DATAASSETS_DATASOURCE_ID",
  "DATAASSETS_PROJECT_ID",
  "DATAASSETS_DATASOURCE_ID",
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function clearDataAssetsEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

afterEach(() => {
  clearDataAssetsEnv();
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
});

describe("execute-table defaults", () => {
  test("prefers KATA-prefixed DataAssets ids", () => {
    clearDataAssetsEnv();
    process.env.KATA_DATAASSETS_PROJECT_ID = "123";
    process.env.KATA_DATAASSETS_DATASOURCE_ID = "ds-kata";
    process.env.DATAASSETS_PROJECT_ID = "456";
    process.env.DATAASSETS_DATASOURCE_ID = "ds-legacy";

    const defaults = resolveExecuteTableDefaults({});

    expect(defaults.projectId).toBe(123);
    expect(defaults.dataSourceId).toBe("ds-kata");
  });

  test("keeps legacy DataAssets id env vars as fallback", () => {
    clearDataAssetsEnv();
    process.env.DATAASSETS_PROJECT_ID = "456";
    process.env.DATAASSETS_DATASOURCE_ID = "ds-legacy";

    const defaults = resolveExecuteTableDefaults({});

    expect(defaults.projectId).toBe(456);
    expect(defaults.dataSourceId).toBe("ds-legacy");
  });

  test("resolves a usable dtstack-cli invocation", () => {
    const invocation = resolveDtstackCliInvocation();

    if (existsSync("./node_modules/.bin/dtstack-cli")) {
      expect(invocation).toEqual({ command: "./node_modules/.bin/dtstack-cli", argsPrefix: [] });
    } else {
      expect(invocation).toEqual({
        command: "bun",
        argsPrefix: ["tools/dtstack-sdk/src/cli.ts"],
      });
    }
  });
});
