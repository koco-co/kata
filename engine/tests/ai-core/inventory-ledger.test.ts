import { describe, expect, it } from "bun:test";
import {
  buildProjectionInventoryFromLedgers,
  parseInventoryLedgerText,
} from "../../src/ai-core/inventory-ledger.ts";

describe("projection inventory ledgers", () => {
  it("builds inventory rows without temporary local exceptions", () => {
    const rows = buildProjectionInventoryFromLedgers();
    const localExceptions = rows.filter((row) => row.disposition === "local_exception");
    expect(localExceptions).toEqual([]);
    expect(
      rows.some(
        (row) =>
          row.path === ".agents/skills/playwright-cli/SKILL.md" &&
          row.disposition === "copied_vendor",
      ),
    ).toBe(true);
    expect(rows.some((row) => row.disposition === "legacy_quarantined_command")).toBe(false);
    expect(
      rows.some(
        (row) => row.path === ".agents/skills/bug-file/SKILL.md" && row.disposition === "generated",
      ),
    ).toBe(true);
  });

  it("fails closed when inventory ledger has malformed indentation", () => {
    const result = parseInventoryLedgerText("files:\n   - path: bad\n", "ledger.yaml");
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.unsupported_indentation");
  });

  it("fails closed with yaml issue when required inventory ledger row fields are missing", () => {
    const result = parseInventoryLedgerText("files:\n  - path: only\n", "ledger.yaml");
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.missing_required_row_field");
  });

  it("fails closed when inventory ledger rows contain unknown fields", () => {
    const result = parseInventoryLedgerText(
      ["files:", "  - path: AGENTS.md", "    runtime: root", "    unexpected: value", ""].join(
        "\n",
      ),
      "ledger.yaml",
    );
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.unknown_row_field");
  });
});
