import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeJsonAtomic } from "../../cli/lib/atomic-writer.ts";
import { readAllureServers, stopAllureServices } from "../../cli/lib/tui/allure.ts";

describe("Allure service registry", () => {
  it("reads an empty or missing registry", () => {
    const file = join(mkdtempSync(join(tmpdir(), "kata-allure-")), "servers.json");
    expect(readAllureServers(file)).toEqual([]);
  });

  it("stops stale records and clears the registry", () => {
    const file = join(mkdtempSync(join(tmpdir(), "kata-allure-")), "servers.json");
    writeJsonAtomic(file, [
      {
        runPath: "/tmp/run",
        reportDir: "/tmp/run/allure-report",
        url: "http://127.0.0.1:1",
        pid: 999_999,
        startedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const result = stopAllureServices(file);
    expect(result.stopped).toBe(0);
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual([]);
  });
});
