import { describe, expect, it } from "bun:test";
import { join, resolve } from "node:path";
import { lintSql, renderSql, resolveAutomationTableName } from "../../cli/lib/automation/sql.ts";

describe("automation sql", () => {
  it("validates generic datasource profiles and dialect-specific syntax", () => {
    expect(
      lintSql(
        `DROP TABLE IF EXISTS \${SchemaA}.test_table_1_c0001; CREATE TABLE IF NOT EXISTS \${SchemaA}.test_table_1_c0001 (id BIGINT);`,
        "SparkThrift2.x",
      ).errors,
    ).toEqual([]);
    expect(
      lintSql(
        "DROP TABLE IF EXISTS x; CREATE TABLE IF NOT EXISTS x (id BIGINT) DISTRIBUTED BY HASH(id);",
        "SparkThrift2.x",
      ).errors.join("\n"),
    ).toContain("Doris/StarRocks 分桶语法");
    expect(
      lintSql(
        "DROP TABLE IF EXISTS x; CREATE TABLE IF NOT EXISTS x (id BIGINT) DISTRIBUTED BY HASH(id);",
        "Doris3.x",
      ).errors,
    ).toEqual([]);
    expect(lintSql("DROP TABLE x; CREATE TABLE x (id NUMBER);", "Oracle").errors).toEqual([]);
    expect(
      lintSql(
        "DROP TABLE IF EXISTS x; CREATE TABLE IF NOT EXISTS x (id NUMBER);",
        "Oracle",
      ).errors.join("\n"),
    ).toContain("Oracle 不支持 IF EXISTS");
    expect(() => lintSql("CREATE TABLE x(id INT)", "Oracle23c")).toThrow("未知 SQL profile");
  });

  it("renders only explicit semantic placeholders", () => {
    expect(
      renderSql(`\${SchemaA}.test_table_1_c0001_\${RunSuffix}`, [
        "SchemaA=dq",
        "RunSuffix=abc12345",
      ]),
    ).toBe("dq.test_table_1_c0001_abc12345");
    expect(() => renderSql(`\${SchemaA}`, [])).toThrow("未提供占位符");
    expect(() => renderSql("{{DATABASE}}", ["DATABASE=dq"])).toThrow("旧占位符");
  });

  it("appends RunSuffix only when precondition setup is enabled", () => {
    expect(
      resolveAutomationTableName("test_table_16178_c0001_source", {
        skipPreconditionSetup: true,
        runSuffix: "run01",
      }),
    ).toBe("test_table_16178_c0001_source");
    expect(
      resolveAutomationTableName("test_table_16178_c0001_source", {
        skipPreconditionSetup: false,
        runSuffix: "run01",
      }),
    ).toBe("test_table_16178_c0001_source_run01");
    expect(() =>
      resolveAutomationTableName("test_table_16178_c0001_lookup", {
        skipPreconditionSetup: false,
        runSuffix: "run01",
      }),
    ).toThrow("功能用例表名非法");
  });

  it("loads the SQL profile from the repository root when invoked in a subdirectory", () => {
    const previous = process.cwd();
    const repoRoot = resolve(import.meta.dir, "../..");
    try {
      process.chdir(join(repoRoot, "cli"));
      expect(
        lintSql("DROP TABLE IF EXISTS x; CREATE TABLE IF NOT EXISTS x (id BIGINT);", "Doris3.x")
          .errors,
      ).toEqual([]);
    } finally {
      process.chdir(previous);
    }
  });
});
