import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../..");

describe("MCP stdio server", () => {
  test("returns a JSON-RPC parse error response for malformed input", () => {
    const result = spawnSync("bun", ["apps/mcp/server.ts"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      input: "{bad json\n",
    });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).not.toBe("");

    const response = JSON.parse(result.stdout.trim());
    expect(response).toEqual({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error" },
    });
  });
});
