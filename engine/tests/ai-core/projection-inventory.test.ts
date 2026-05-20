import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseProjectionInventory,
  parseProjectionInventoryText,
  scanRuntimeFiles,
  validateProjectionInventory,
} from "../../src/ai-core/projection-inventory.ts";

describe("projection inventory", () => {
  it("supports all GA-core inventory dispositions", () => {
    const inventory = parseProjectionInventory(
      [
        "files:",
        "  - path: .agents/skills/workspace-manage/SKILL.md",
        "    runtime: codex",
        "    disposition: generated",
        "  - path: .agents/skills/playwright-cli/SKILL.md",
        "    runtime: codex",
        "    disposition: copied_vendor",
        "  - path: .agents/skills/removed/SKILL.md",
        "    runtime: codex",
        "    disposition: deleted",
        "    source: removed historical runtime file",
        "    reason: Historical runtime surface is no longer retained.",
        "  - path: AGENTS.md",
        "    runtime: codex",
        "    disposition: local_exception",
        "    owner: user",
        "    expires: 2026-06-01",
        "",
      ].join("\n"),
    );
    expect(inventory.map((row) => row.disposition)).toEqual([
      "generated",
      "copied_vendor",
      "deleted",
      "local_exception",
    ]);
  });

  it("fails closed when projection inventory has malformed indentation", () => {
    const result = parseProjectionInventoryText(
      "files:\n   - path: bad\n",
      ".ai/core/runtimes/projection-inventory.yaml",
    );
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.unsupported_indentation");
  });

  it("fails closed with yaml issue when required projection inventory row fields are missing", () => {
    const result = parseProjectionInventoryText(
      "files:\n  - path: only\n",
      ".ai/core/runtimes/projection-inventory.yaml",
    );
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.missing_required_row_field");
  });

  it("fails closed when projection inventory rows contain unknown fields", () => {
    const result = parseProjectionInventoryText(
      [
        "files:",
        "  - path: AGENTS.md",
        "    runtime: root",
        "    disposition: generated",
        "    unexpected: value",
        "",
      ].join("\n"),
    );
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.unknown_row_field");
  });

  it("flags unclassified runtime files", () => {
    const files = [".agents/skills/unknown/SKILL.md"];
    const result = validateProjectionInventory({ files, inventory: [] });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "projection_inventory.unclassified_file",
    );
  });

  it("flags deleted inventory rows when the runtime file is still present", () => {
    const files = [".agents/skills/removed/SKILL.md"];
    const inventory = parseProjectionInventory(
      [
        "files:",
        "  - path: .agents/skills/removed/SKILL.md",
        "    runtime: codex",
        "    disposition: deleted",
        "",
      ].join("\n"),
    );
    const result = validateProjectionInventory({ files, inventory });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "projection_inventory.deleted_file_present",
    );
  });

  it("requires deleted rows to declare source and reason", () => {
    const inventory = parseProjectionInventory(
      [
        "files:",
        "  - path: .agents/skills/removed/SKILL.md",
        "    runtime: codex",
        "    disposition: deleted",
        "",
      ].join("\n"),
    );
    const result = validateProjectionInventory({ files: [], inventory });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "projection_inventory.deleted_missing_metadata",
    );
  });

  it("accepts deleted rows with explicit source and reason", () => {
    const inventory = parseProjectionInventory(
      [
        "files:",
        "  - path: .agents/skills/removed/SKILL.md",
        "    runtime: codex",
        "    disposition: deleted",
        "    source: .agents/skills/removed/SKILL.md",
        "    reason: Replaced by .agents/skills/replacement/SKILL.md.",
        "",
      ].join("\n"),
    );
    const result = validateProjectionInventory({ files: [], inventory });
    expect(result.ok).toBe(true);
  });

  it("requires deleted rows to point to explicit runtime files", () => {
    const inventory = parseProjectionInventory(
      [
        "files:",
        "  - path: .agents/skills/removed",
        "    runtime: codex",
        "    disposition: deleted",
        "    source: .ai/core/migrations/skill-rename-map.yaml",
        "    reason: Replaced by .agents/skills/replacement/SKILL.md.",
        "",
      ].join("\n"),
    );
    const result = validateProjectionInventory({ files: [], inventory });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "projection_inventory.deleted_not_file_path",
    );
  });

  it("requires local exception debt metadata", () => {
    const files = ["AGENTS.md"];
    const inventory = parseProjectionInventory(
      [
        "files:",
        "  - path: AGENTS.md",
        "    runtime: root",
        "    disposition: local_exception",
        "",
      ].join("\n"),
    );
    const result = validateProjectionInventory({ files, inventory });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "projection_inventory.local_exception_missing_metadata",
    );
  });

  it("requires local exception expiry to use ISO date format", () => {
    const files = ["AGENTS.md"];
    const inventory = parseProjectionInventory(
      [
        "files:",
        "  - path: AGENTS.md",
        "    runtime: root",
        "    disposition: local_exception",
        "    owner: user",
        "    expires: 06/01/2026",
        "    reason: Root runtime doc projection is implemented later.",
        "",
      ].join("\n"),
    );
    const result = validateProjectionInventory({ files, inventory });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "projection_inventory.local_exception_invalid_expiry",
    );
  });

  it("flags expired local exceptions", () => {
    const files = ["AGENTS.md"];
    const inventory = parseProjectionInventory(
      [
        "files:",
        "  - path: AGENTS.md",
        "    runtime: root",
        "    disposition: local_exception",
        "    owner: user",
        "    expires: 2000-01-01",
        "    reason: Root runtime doc projection is implemented later.",
        "",
      ].join("\n"),
    );
    const result = validateProjectionInventory({ files, inventory });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "projection_inventory.local_exception_expired",
    );
  });

  it("accepts local exceptions with complete unexpired metadata", () => {
    const files = ["AGENTS.md"];
    const inventory = parseProjectionInventory(
      [
        "files:",
        "  - path: AGENTS.md",
        "    runtime: root",
        "    disposition: local_exception",
        "    owner: user",
        "    expires: 2099-01-01",
        "    reason: Root runtime doc projection is implemented later.",
        "",
      ].join("\n"),
    );
    const result = validateProjectionInventory({ files, inventory });
    expect(result.ok).toBe(true);
  });

  it("scans current Claude and Codex runtime files", () => {
    const files = scanRuntimeFiles();
    expect(files).toContain(".agents/skills/playwright-cli/SKILL.md");
    expect(files).toContain(".claude/skills/playwright-cli/SKILL.md");
  });

  it("scans runtime files from a custom root", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-runtime-scan-"));
    mkdirSync(join(root, ".agents/skills/custom"), { recursive: true });
    mkdirSync(join(root, ".claude/skills/custom"), { recursive: true });
    writeFileSync(join(root, ".agents/skills/custom/SKILL.md"), "# Custom\n");
    writeFileSync(join(root, ".agents/.DS_Store"), "macos\n");
    writeFileSync(join(root, ".claude/skills/custom/SKILL.md"), "# Custom\n");
    writeFileSync(join(root, ".claude/.DS_Store"), "macos\n");
    writeFileSync(join(root, ".claude/settings.local.json"), "{}\n");
    writeFileSync(join(root, ".claude/launch.json"), "{}\n");
    writeFileSync(join(root, ".claude/scheduled_tasks.lock"), "{}\n");
    writeFileSync(join(root, "AGENTS.md"), "# Agents\n");
    const files = scanRuntimeFiles(root);
    expect(files).toEqual([
      ".agents/skills/custom/SKILL.md",
      ".claude/skills/custom/SKILL.md",
      "AGENTS.md",
    ]);
  });
});
