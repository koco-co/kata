import { describe, expect, it } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { loadAiCore } from "../../src/ai-core/load.ts";

const root = join(import.meta.dirname, "../../..");

function copyCoreFixture(): { root: string; coreRoot: string } {
  const tempRoot = mkdtempSync(join(tmpdir(), "kata-load-core-"));
  const coreRoot = join(tempRoot, ".ai/core");
  mkdirSync(dirname(coreRoot), { recursive: true });
  cpSync(join(root, ".ai/core"), coreRoot, { recursive: true });
  return { root: tempRoot, coreRoot };
}

describe("loadAiCore", () => {
  it("loads schemas, guards, roots, and discovered contracts", async () => {
    const core = await loadAiCore();
    expect(core.schemas.map((schema) => schema.id)).toContain("SourceSnapshot@1");
    expect(core.guards.map((guard) => guard.id)).toContain("write_policy.block_repos_write@1");
    expect(core.implementationRoots).toContain("engine/src/ai-core/**");
    expect(core.implementationRoots).not.toContain("engine/lib/**");
    expect(core.implementationRoots).not.toContain("engine/src/schemas/**");
    expect(core.skills.map((skill) => skill.id)).toContain("case-draft@1");
    expect(core.plugins.map((plugin) => plugin.id)).toContain(
      "fixture-design-source.fetch-design-doc@1",
    );
  });

  it("fails closed when registry yaml has malformed indentation", async () => {
    const fixture = copyCoreFixture();
    writeFileSync(join(fixture.coreRoot, "schemas/registry.yaml"), "schemas:\n   - id: bad\n");

    await expect(loadAiCore(fixture)).rejects.toThrow("yaml.unsupported_indentation");
  });

  it("fails closed when registry rows contain unknown fields", async () => {
    const fixture = copyCoreFixture();
    writeFileSync(
      join(fixture.coreRoot, "schemas/registry.yaml"),
      [
        "schemas:",
        "  - id: Contract@1",
        "    version: 1",
        "    path: .ai/core/schemas/Contract.v1.schema.json",
        "    unexpected: value",
        "",
      ].join("\n"),
    );

    await expect(loadAiCore(fixture)).rejects.toThrow("yaml.unknown_row_field");
  });

  it("fails closed with yaml issue when schema registry rows are missing version", async () => {
    const fixture = copyCoreFixture();
    writeFileSync(
      join(fixture.coreRoot, "schemas/registry.yaml"),
      [
        "schemas:",
        "  - id: Contract@1",
        "    path: .ai/core/schemas/Contract.v1.schema.json",
        "",
      ].join("\n"),
    );

    await expect(loadAiCore(fixture)).rejects.toThrow("yaml.missing_required_row_field");
  });

  it("fails closed with yaml issue when guard registry rows are missing implementation", async () => {
    const fixture = copyCoreFixture();
    writeFileSync(
      join(fixture.coreRoot, "guards/registry.yaml"),
      ["guards:", "  - id: write_policy.example@1", "    kind: write_policy", ""].join("\n"),
    );

    await expect(loadAiCore(fixture)).rejects.toThrow("yaml.missing_required_row_field");
  });

  it("fails closed with yaml issue when runtime root rows are missing hidden_id_lint", async () => {
    const fixture = copyCoreFixture();
    writeFileSync(
      join(fixture.coreRoot, "runtimes/implementation-roots.yaml"),
      ["implementation_roots:", "  - path: engine/src/ai-core/**", "    status: declared", ""].join(
        "\n",
      ),
    );

    await expect(loadAiCore(fixture)).rejects.toThrow("yaml.missing_required_row_field");
  });
});
