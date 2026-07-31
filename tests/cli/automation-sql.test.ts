import { describe, expect, it } from "bun:test";
import { join, resolve } from "node:path";
import { lintSql, renderSql } from "../../cli/lib/automation/sql.ts";

describe("automation sql", () => {
  it("validates registered placeholders and forbidden fragments", () => {
    expect(
      lintSql(
        "CREATE TABLE {{DATABASE}}.a_{{SUFFIX}}; INSERT INTO x; ALTER TABLE x;",
        "data-assets-15862-doris",
      ).errors,
    ).toEqual([]);
    expect(lintSql("CREATE TABLE pw_test.a;", "data-assets-15862-doris").errors).toContain(
      "包含禁止片段 pw_test",
    );
  });

  it("renders only explicit uppercase placeholders", () => {
    expect(renderSql("{{DATABASE}}.x_{{SUFFIX}}", ["DATABASE=dq", "SUFFIX=abc12345"])).toBe(
      "dq.x_abc12345",
    );
    expect(() => renderSql("{{DATABASE}}", [])).toThrow("未提供占位符");
  });

  it("loads the SQL profile from the repository root when invoked in a subdirectory", () => {
    const previous = process.cwd();
    const repoRoot = resolve(import.meta.dir, "../..");
    try {
      process.chdir(join(repoRoot, "cli"));
      expect(
        lintSql(
          "CREATE TABLE {{DATABASE}}.a_{{SUFFIX}}; INSERT INTO x; ALTER TABLE x;",
          "data-assets-15862-doris",
        ).errors,
      ).toEqual([]);
    } finally {
      process.chdir(previous);
    }
  });
});
