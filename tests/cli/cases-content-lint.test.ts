import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { lintCaseContent, loadCasesLintConfig } from "../../cli/lib/cases/content-lint.ts";
import type { CaseItem, CasesFile } from "../../cli/lib/cases/types.ts";

const repoRoot = resolve(import.meta.dir, "../..");
const config = loadCasesLintConfig(repoRoot);

function testCase(overrides: Partial<CaseItem> = {}): CaseItem {
  return {
    id: "C0001",
    requirement_id: "16178",
    title: "验证规则配置保存成功",
    priority: "P0",
    precondition: "无",
    steps: [
      {
        action: "进入【数据质量 → 规则库配置】页面",
        expected: "展示规则库配置列表与新增入口",
      },
    ],
    ...overrides,
  };
}

function doc(item: CaseItem, metaTitle = "需求中可以出现准备字样"): CasesFile {
  return {
    meta: { title: metaTitle, requirement_id: "16178", case_module_id: "" },
    cases: [item],
  };
}

const validSparkPrecondition = `数据源 A：
- 数据源：\${DataSourceA}
- 数据源类型：SparkThrift2.x
- 数据库：\${SchemaA}
- 初始化 SQL：
    DROP TABLE IF EXISTS \${SchemaA}.test_table_16178_c0001;
    CREATE TABLE IF NOT EXISTS \${SchemaA}.test_table_16178_c0001 (
      id BIGINT,
      dept_id BIGINT
    );
    INSERT INTO \${SchemaA}.test_table_16178_c0001 VALUES
      (1, 10),
      (2, 20);`;

describe("cases content lint", () => {
  it("loads the global config without ornamental schema metadata", () => {
    expect(config.default_datasource_type).toBe("SparkThrift2.x");
    expect(config.datasource_types).toContain("SparkThrift2.x");
    expect(config.datasource_types).toContain("Oracle");
    expect(config.datasource_types).toContain("GaussDB9.1");
    expect(config.table_roles).toEqual(["source", "target", "comparison", "dimension"]);
    expect(config.forbidden_terms.login_state).toContain("已登录");
    expect(config.forbidden_terms.vague_setup).toContain("当前账号");
    expect(config.forbidden_terms.process_residue).toContain("未分类");
    expect(config.forbidden_terms.generic_assertion).toContain("逻辑正常");
    expect(config).not.toHaveProperty("schema");
    expect(config).not.toHaveProperty("schema_version");
  });

  it("accepts a canonical SparkThrift fixture and ignores non-case metadata", () => {
    expect(
      lintCaseContent(doc(testCase({ precondition: validSparkPrecondition })), config),
    ).toEqual([]);
  });

  it("rejects forbidden wording only from authored case semantic fields", () => {
    const violations = lintCaseContent(
      doc(testCase({ precondition: "准备测试数据", tags: ["可能失败"] })),
      config,
    );
    expect(violations.map((item) => item.rule)).toContain("case_forbidden_term");
    expect(violations.map((item) => item.message).join("\n")).toContain("准备");
    expect(violations.map((item) => item.message).join("\n")).toContain("可能");
    expect(violations.map((item) => item.message).join("\n")).not.toContain("C0001");
  });

  it("rejects newly covered vague setup, placeholder nodes and generic assertions", () => {
    const violations = lintCaseContent(
      doc(
        testCase({
          precondition: "当前账号进入页面并配置未分类数据",
          steps: [
            {
              action: "进入【数据质量 → 规则库配置】页面",
              expected: "保存后逻辑正常",
            },
          ],
        }),
      ),
      config,
    );
    const message = violations.map((item) => item.message).join("\n");
    expect(violations.map((item) => item.rule)).toContain("case_forbidden_term");
    expect(message).toContain("当前账号");
    expect(message).toContain("未分类");
    expect(message).toContain("逻辑正常");
  });

  it("requires a standalone canonical first navigation step and reports expected versus actual", () => {
    const violations = lintCaseContent(
      doc(
        testCase({
          steps: [{ action: "点击新增按钮", expected: "打开新增弹窗" }],
        }),
      ),
      config,
    );
    const violation = violations.find((item) => item.rule === "case_first_step_navigation");
    expect(violation?.message).toContain(
      "预期: 进入【实际一级模块 → 实际页面】页面, e.g. 进入【数据质量 → 规则库配置】页面.",
    );
    expect(violation?.message).toContain("实际: 点击新增按钮");
    expect(violation?.message).not.toContain("C0001");
  });

  it("requires an exact datasource block, canonical type and paired placeholders", () => {
    const alias = validSparkPrecondition.replace("SparkThrift2.x", "sparkthrift2.x");
    const mismatched = validSparkPrecondition.replaceAll(`\${SchemaA}`, `\${SchemaB}`);
    const aliasErrors = lintCaseContent(doc(testCase({ precondition: alias })), config);
    const mismatchErrors = lintCaseContent(doc(testCase({ precondition: mismatched })), config);
    expect(aliasErrors.map((item) => item.rule)).toContain("case_datasource_type");
    expect(mismatchErrors.map((item) => item.rule)).toContain("case_datasource_pair");
  });

  it("blocks an unregistered datasource type instead of falling back", () => {
    const oracle = validSparkPrecondition
      .replace("SparkThrift2.x", "Oracle23c")
      .replace("DROP TABLE IF EXISTS", "DROP TABLE")
      .replace("CREATE TABLE IF NOT EXISTS", "CREATE TABLE");
    const violations = lintCaseContent(doc(testCase({ precondition: oracle })), config);
    expect(violations.map((item) => item.rule)).toContain("case_datasource_type");
    expect(violations.map((item) => item.message).join("\n")).toContain("未注册");
  });

  it("requires SQL for a datasource/schema pair while keeping raw historical SQL outside the trigger", () => {
    const pairWithoutSql = `数据源 A：
- 数据源：\${DataSourceA}
- 数据源类型：SparkThrift2.x
- 数据库：\${SchemaA}`;
    expect(
      lintCaseContent(doc(testCase({ precondition: pairWithoutSql })), config).map(
        (item) => item.rule,
      ),
    ).toContain("case_datasource_sql");

    const sqlWithoutPair = `DROP TABLE IF EXISTS legacy_table;
CREATE TABLE IF NOT EXISTS legacy_table (id BIGINT);`;
    expect(
      lintCaseContent(doc(testCase({ precondition: sqlWithoutPair })), config).map(
        (item) => item.rule,
      ),
    ).not.toContain("case_datasource_pair");

    const datasourceOnly = `数据源：\${DataSourceA}；用于数据源选择和表列表查询。`;
    expect(
      lintCaseContent(doc(testCase({ precondition: datasourceOnly })), config).map(
        (item) => item.rule,
      ),
    ).not.toContain("case_datasource_pair");
  });

  it("allows a declared empty table without INSERT but requires deterministic DROP and CREATE", () => {
    const emptyTable = validSparkPrecondition
      .replace(/\n {4}INSERT INTO[\s\S]*$/, "")
      .replace("- 初始化 SQL：", "- 该表为空表。\n- 初始化 SQL：");
    expect(lintCaseContent(doc(testCase({ precondition: emptyTable })), config)).toEqual([]);

    const missingDrop = validSparkPrecondition.replace(
      `    DROP TABLE IF EXISTS \${SchemaA}.test_table_16178_c0001;\n`,
      "",
    );
    expect(
      lintCaseContent(doc(testCase({ precondition: missingDrop })), config).map(
        (item) => item.rule,
      ),
    ).toContain("case_sql_profile");
  });

  it("checks dialect-specific fragments", () => {
    const dorisDdl = validSparkPrecondition.replace(
      "    INSERT INTO",
      "    DISTRIBUTED BY HASH(id) BUCKETS 1;\n    INSERT INTO",
    );
    expect(
      lintCaseContent(doc(testCase({ precondition: dorisDdl })), config).map((item) => item.rule),
    ).toContain("case_sql_profile");
  });

  it("enforces stable table names, qualified schema and the closed multi-table role set", () => {
    const badName = validSparkPrecondition.replaceAll("test_table_16178_c0001", "user_profile");
    expect(
      lintCaseContent(doc(testCase({ precondition: badName })), config).map((item) => item.rule),
    ).toContain("case_sql_table_name");

    const multiWithoutRoles = `${validSparkPrecondition}
    DROP TABLE IF EXISTS \${SchemaA}.test_table_16178_c0001_02;
    CREATE TABLE IF NOT EXISTS \${SchemaA}.test_table_16178_c0001_02 (id BIGINT);`;
    expect(
      lintCaseContent(doc(testCase({ precondition: multiWithoutRoles })), config).map(
        (item) => item.rule,
      ),
    ).toContain("case_sql_table_name");

    const invalidRole = validSparkPrecondition.replaceAll(
      "test_table_16178_c0001",
      "test_table_16178_c0001_lookup",
    );
    expect(
      lintCaseContent(doc(testCase({ precondition: invalidRole })), config).map(
        (item) => item.rule,
      ),
    ).toContain("case_sql_table_name");
  });

  it("forbids RunSuffix in functional YAML", () => {
    const suffixed = validSparkPrecondition.replaceAll(
      "test_table_16178_c0001",
      `test_table_16178_c0001_\${RunSuffix}`,
    );
    expect(
      lintCaseContent(doc(testCase({ precondition: suffixed })), config).map((item) => item.rule),
    ).toContain("case_run_suffix");
  });
});
