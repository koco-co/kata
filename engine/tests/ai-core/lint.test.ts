import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintAiCore } from "../../src/ai-core/lint.ts";

describe("ai-core strict lint", () => {
  it("blocks runtime contract references to docs paths", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-"));
    mkdirSync(join(root, ".ai/core/skills/bad"), { recursive: true });
    writeFileSync(
      join(root, ".ai/core/skills/bad/skill.yaml"),
      ["id: bad-skill@1", "references:", "  - docs/superpowers/specs/design.md", ""].join("\n"),
    );
    const result = await lintAiCore({ root, strict: true });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("docs_reference.blocked");
  });

  it("flags hidden contract ids in transitional implementation roots", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-"));
    mkdirSync(join(root, "engine/lib"), { recursive: true });
    mkdirSync(join(root, ".ai/core/runtimes"), { recursive: true });
    writeFileSync(
      join(root, ".ai/core/runtimes/implementation-roots.yaml"),
      [
        "implementation_roots:",
        "  - path: engine/lib/**",
        "    status: transitional",
        "    hidden_id_lint: true",
        "",
      ].join("\n"),
    );
    writeFileSync(join(root, "engine/lib/hidden.ts"), 'export const guardId = "secret.guard@1";\n');
    const result = await lintAiCore({ root, strict: true });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("hidden_contract_id.blocked");
  });

  it("does not flag email-like text in hidden-id-linted roots", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-"));
    mkdirSync(join(root, "engine/lib"), { recursive: true });
    mkdirSync(join(root, ".ai/core/runtimes"), { recursive: true });
    writeFileSync(
      join(root, ".ai/core/runtimes/implementation-roots.yaml"),
      [
        "implementation_roots:",
        "  - path: engine/lib/**",
        "    status: transitional",
        "    hidden_id_lint: true",
        "",
      ].join("\n"),
    );
    writeFileSync(join(root, "engine/lib/email.ts"), 'export const sample = "user@1.example";\n');
    const result = await lintAiCore({ root, strict: true });
    expect(result.ok).toBe(true);
    expect(result.issues.map((issue) => issue.code)).not.toContain("hidden_contract_id.blocked");
  });

  it("continues to flag real contract-like ids in hidden-id-linted roots", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-"));
    mkdirSync(join(root, "engine/lib"), { recursive: true });
    mkdirSync(join(root, ".ai/core/runtimes"), { recursive: true });
    writeFileSync(
      join(root, ".ai/core/runtimes/implementation-roots.yaml"),
      [
        "implementation_roots:",
        "  - path: engine/lib/**",
        "    status: transitional",
        "    hidden_id_lint: true",
        "",
      ].join("\n"),
    );
    writeFileSync(join(root, "engine/lib/hidden.ts"), 'export const guardId = "secret.guard@1";\n');
    const result = await lintAiCore({ root, strict: true });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("hidden_contract_id.blocked");
  });

  it("does not run hidden-id lint over runtime contract files", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-"));
    mkdirSync(join(root, ".ai/core/guards"), { recursive: true });
    mkdirSync(join(root, ".ai/core/runtimes"), { recursive: true });
    writeFileSync(
      join(root, ".ai/core/runtimes/implementation-roots.yaml"),
      [
        "implementation_roots:",
        "  - path: engine/lib/**",
        "    status: transitional",
        "    hidden_id_lint: true",
        "",
      ].join("\n"),
    );
    writeFileSync(
      join(root, ".ai/core/guards/registry.yaml"),
      ["guards:", "  - id: secret.guard@1", ""].join("\n"),
    );
    const result = await lintAiCore({ root, strict: true });
    expect(result.ok).toBe(true);
    expect(result.issues.map((issue) => issue.code)).not.toContain("hidden_contract_id.blocked");
  });

  it("flags unclassified runtime files in projection inventory", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-"));
    mkdirSync(join(root, ".agents/skills/unknown"), { recursive: true });
    mkdirSync(join(root, ".ai/core/runtimes"), { recursive: true });
    writeFileSync(join(root, ".agents/skills/unknown/SKILL.md"), "# Unknown\n");
    writeFileSync(join(root, ".ai/core/runtimes/projection-inventory.yaml"), "files:\n");
    const result = await lintAiCore({ root, strict: true });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "projection_inventory.unclassified_file",
    );
  });

  it("flags missing projection inventory when runtime files exist", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-"));
    mkdirSync(join(root, ".agents/skills/unknown"), { recursive: true });
    writeFileSync(join(root, ".agents/skills/unknown/SKILL.md"), "# Unknown\n");
    const result = await lintAiCore({ root, strict: true });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("projection_inventory.missing");
  });

  it("flags stale UI automation surface references in README.md", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-"));
    writeFileSync(join(root, "README.md"), "# Project\n\nUse `/ui-plan` to plan.\n");
    const result = await lintAiCore({ root, strict: true });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("lint.stale_ui_automation_surface");
  });

  it("flags stale UI automation surface references in .ai/core/commands/ YAML files", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-"));
    mkdirSync(join(root, ".ai/core/commands"), { recursive: true });
    writeFileSync(
      join(root, ".ai/core/commands/build.yaml"),
      ["commands:", "  - id: playwright-gen@1", ""].join("\n"),
    );
    const result = await lintAiCore({ root, strict: true });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("lint.stale_ui_automation_surface");
  });

  it("does not flag stale UI automation references in allowed paths", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-"));
    mkdirSync(join(root, "docs/superpowers/specs"), { recursive: true });
    writeFileSync(
      join(root, "docs/superpowers/specs/design.md"),
      "# Design\n\nReferences `/ui-plan` as historical context.\n",
    );
    mkdirSync(join(root, ".ai/core/runtimes"), { recursive: true });
    writeFileSync(join(root, ".ai/core/runtimes/projection-inventory.yaml"), "files:\n");
    const result = await lintAiCore({ root, strict: true });
    expect(result.issues.map((issue) => issue.code)).not.toContain(
      "lint.stale_ui_automation_surface",
    );
  });

  it("does not block hard AI Core trust claims in non-quarantined runtime files", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-"));
    mkdirSync(join(root, ".agents/skills/generated"), { recursive: true });
    mkdirSync(join(root, ".ai/core/runtimes"), { recursive: true });
    writeFileSync(
      join(root, ".agents/skills/generated/SKILL.md"),
      ["# Generated", "", "This file is inside the AI Core trust boundary.", ""].join("\n"),
    );
    writeFileSync(
      join(root, ".ai/core/runtimes/projection-inventory.yaml"),
      [
        "files:",
        "  - path: .agents/skills/generated/SKILL.md",
        "    runtime: codex",
        "    disposition: generated",
        "    source: .ai/core/skills/generated/skill.yaml",
        "",
      ].join("\n"),
    );
    const result = await lintAiCore({ root, strict: true });
    expect(result.issues.map((issue) => issue.code)).not.toContain(
      "legacy_quarantine.forbidden_claim",
    );
  });

  it("audits plugin runtime metadata under the provided root", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-"));
    mkdirSync(join(root, ".ai/core/plugins/drifty"), { recursive: true });
    mkdirSync(join(root, "plugins/drifty"), { recursive: true });
    writeFileSync(
      join(root, ".ai/core/plugins/drifty/runtime.json"),
      JSON.stringify({ name: "drifty", description: "new", commands: { fetch: "new" } }),
    );
    writeFileSync(
      join(root, "plugins/drifty/plugin.json"),
      JSON.stringify({ name: "drifty", description: "old", commands: { fetch: "old" } }),
    );

    const result = await lintAiCore({ root, strict: true });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("plugin_runtime.legacy_drift");
  });
});
