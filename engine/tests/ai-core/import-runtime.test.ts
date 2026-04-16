import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildRuntimeImportRecords } from "../../src/ai-core/import-runtime.ts";

describe("runtime import records", () => {
  it("does not retain historical import records after no-compat cleanup", async () => {
    const records = await buildRuntimeImportRecords();
    expect(records).toEqual([]);
  });

  it("fails closed when an import record is empty", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-import-records-"));
    mkdirSync(join(root, ".ai/core/imports/records"), { recursive: true });
    writeFileSync(join(root, ".ai/core/imports/records/empty.yaml"), "");

    await expect(buildRuntimeImportRecords(root)).rejects.toThrow(
      ".ai/core/imports/records/empty.yaml missing required fields: source_id, target_id, status",
    );
  });

  it("fails closed when an import record is missing required fields", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-import-records-"));
    mkdirSync(join(root, ".ai/core/imports/records"), { recursive: true });
    writeFileSync(
      join(root, ".ai/core/imports/records/malformed.yaml"),
      ["source_id: fixture-source", "status: active", ""].join("\n"),
    );

    await expect(buildRuntimeImportRecords(root)).rejects.toThrow(
      ".ai/core/imports/records/malformed.yaml missing required fields: target_id",
    );
  });
});
