import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSchemaCompatCheck } from "../../src/ai-core/schema-compat.ts";

function writeMinimalCore(rootDir: string, schemasYaml: string): string {
  const coreRoot = join(rootDir, ".ai/core");
  mkdirSync(join(coreRoot, "schemas"), { recursive: true });
  mkdirSync(join(coreRoot, "guards"), { recursive: true });
  mkdirSync(join(coreRoot, "runtimes"), { recursive: true });
  writeFileSync(join(coreRoot, "schemas/registry.yaml"), schemasYaml);
  writeFileSync(join(coreRoot, "guards/registry.yaml"), "guards:\n");
  writeFileSync(join(coreRoot, "runtimes/implementation-roots.yaml"), "implementation_roots:\n");
  return coreRoot;
}

describe("schema compat check", () => {
  it("checks every active schema registry entry has a file and version", async () => {
    const result = await runSchemaCompatCheck();
    expect(result.ok).toBe(true);
  });

  it("reports missing schema files from an override core root", async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-schema-missing-"));
    const coreRoot = writeMinimalCore(
      fixtureRoot,
      [
        "schemas:",
        "  - id: MissingSchema@1",
        "    version: 1",
        "    path: .ai/core/schemas/MissingSchema.v1.schema.json",
        "",
      ].join("\n"),
    );

    const result = await runSchemaCompatCheck({ root: fixtureRoot, coreRoot });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "schema_compat.missing_file",
        contractId: "MissingSchema@1",
      }),
    ]);
  });

  it("reports invalid schema versions from an override core root", async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-schema-version-"));
    const coreRoot = writeMinimalCore(
      fixtureRoot,
      [
        "schemas:",
        "  - id: BadVersionSchema@1",
        "    version: 0",
        "    path: .ai/core/schemas/BadVersionSchema.v1.schema.json",
        "",
      ].join("\n"),
    );
    writeFileSync(join(coreRoot, "schemas/BadVersionSchema.v1.schema.json"), "{}\n");

    const result = await runSchemaCompatCheck({ root: fixtureRoot, coreRoot });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "schema_compat.invalid_version",
        contractId: "BadVersionSchema@1",
      }),
    ]);
  });
});
