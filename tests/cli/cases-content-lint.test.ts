import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import {
  lintCaseContent,
  lintCaseYamlSource,
  loadCasesLintConfig,
} from "../../cli/lib/cases/content-lint.ts";
import type { CaseItem, CasesFile } from "../../cli/lib/cases/types.ts";

const repoRoot = resolve(import.meta.dir, "../..");
const config = loadCasesLintConfig(repoRoot);

function testCase(overrides: Partial<CaseItem> = {}): CaseItem {
  return {
    id: "C0001",
    requirement_id: "16178",
    title: "验证【数据质量】-【规则库配置】保存规则，列表新增记录并显示启用状态",
    priority: "P0",
    precondition: "无",
    steps: [
      {
        action: "进入【数据质量 → 规则库配置】页面",
        expected: "进入成功",
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

const validSparkPrecondition = `1) 授权数据源：\${DataSourceA}
2) 数据源类型：SparkThrift2.x
3) 存在数据库：\${SchemaA}
4) 创建数据表并插入 2 行数据：
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
    expect(config.forbidden_terms.placeholder_residue).toContain("TODO");
    expect(config.first_step_result).toBe("进入成功");
    expect(config.bulk_row_threshold).toBe(5);
    expect(config).not.toHaveProperty("schema");
    expect(config).not.toHaveProperty("schema_version");
  });

  it("accepts a canonical SparkThrift fixture and ignores non-case metadata", () => {
    expect(
      lintCaseContent(doc(testCase({ precondition: validSparkPrecondition })), config),
    ).toEqual([]);
  });

  it("requires environment instances to use placeholders while allowing concrete table names", () => {
    const valid = testCase({
      precondition: `1) 项目：\${ProjectA}
2) 授权数据源：\${DataSourceA}
3) 数据源类型：SparkThrift2.x
4) 存在数据库：\${SchemaA}
5) 创建数据表：
   DROP TABLE IF EXISTS \${SchemaA}.test_table_16178_c0001;
   CREATE TABLE IF NOT EXISTS \${SchemaA}.test_table_16178_c0001 (id BIGINT);
   INSERT INTO \${SchemaA}.test_table_16178_c0001 VALUES (1);`,
      steps: [
        { action: "进入【数据质量 → 规则库配置】页面", expected: "进入成功" },
        {
          action: `选择项目 \${ProjectA}、数据源 \${DataSourceA} 和 \${SchemaA}.test_table_16178_c0001`,
          expected: `对象回显为 \${ProjectA}、\${DataSourceA}、\${SchemaA}.test_table_16178_c0001`,
        },
      ],
    });
    expect(lintCaseContent(doc(valid), config)).toEqual([]);

    const concrete = testCase({
      precondition: `1) 离线项目名称：「offline_15353」
2) 项目中已引入名称为「hive_15353」的 Hive 数据源
3) hive_15353 中存在数据库「doris_demo」和表「test_table_16178_c0001」`,
      steps: [
        { action: "进入【离线开发 → 数据源】页面", expected: "进入成功" },
        { action: "选择 hive_15353.doris_demo.test_table_16178_c0001", expected: "对象展示" },
      ],
    });
    const violations = lintCaseContent(doc(concrete), config);
    const environment = violations.find((item) => item.rule === "case_environment_placeholders");
    expect(environment).toBeDefined();
    expect(environment?.message).toContain("offline_15353");
    expect(environment?.message).toContain("hive_15353");
    expect(environment?.message).toContain("doris_demo");
    expect(environment?.message).not.toContain("test_table_16178_c0001");
  });

  it("requires business fixtures to use semantic placeholders and gives exact replacements", () => {
    const concrete = testCase({
      precondition: `1) 使用 TenantA 中的账号 StandardAdminA 登录
2) 末级标准目录「目录编辑标准C0002」中存在标准「目录编辑标准C0002」
3) 标准编号为「STD-16209-C0002」`,
    });
    const violation = lintCaseContent(doc(concrete), config).find(
      (item) => item.rule === "case_business_placeholders",
    );
    expect(violation).toBeDefined();
    expect(violation?.message).toContain("StandardAdminA → UserA");
    expect(violation?.message).toContain("目录编辑标准C0002 → CatalogA");
    expect(violation?.message).toContain("目录编辑标准C0002 → StandardA");
    expect(violation?.message).toContain("STD-16209-C0002 → StandardCodeA");

    const semantic = testCase({
      precondition: `1) 使用 TenantA 中的账号 UserA 登录
2) 末级标准目录 CatalogA 中存在标准 StandardA
3) 标准编号为 StandardCodeA
4) 文件 fixture.csv 已准备，表 test_table_16178_c0001 已创建`,
    });
    expect(
      lintCaseContent(doc(semantic), config).some(
        (item) => item.rule === "case_business_placeholders",
      ),
    ).toBe(false);
  });

  it("requires tags to start with the first navigation path and allows functional detail", () => {
    // 导航路径作为前缀，功能细节可追加
    expect(
      lintCaseContent(doc(testCase({ tags: ["数据质量", "规则库配置", "目录筛选"] })), config),
    ).toEqual([]);
    // 缺模块：导航路径不是前缀
    const noModule = testCase({ tags: ["规则库配置", "目录筛选"] });
    const violation = lintCaseContent(doc(noModule), config).find(
      (entry) => entry.rule === "case_tags_navigation",
    );
    expect(violation).toBeDefined();
    expect(violation?.message).toContain("实际：规则库配置、目录筛选");
    expect(violation?.message).toContain("修复：将 tags 改为 [数据质量, 规则库配置] 开头");
    // 缺菜单层级
    const noMenu = testCase({ tags: ["数据质量", "目录筛选"] });
    expect(
      lintCaseContent(doc(noMenu), config).some((entry) => entry.rule === "case_tags_navigation"),
    ).toBe(true);
  });

  it("does not treat option values or statuses as business instances", () => {
    const item = testCase({
      precondition: `1) 选择手动任务「限制」
2) 规则「启用」后保存`,
    });
    expect(
      lintCaseContent(doc(item), config).some(
        (entry) => entry.rule === "case_business_placeholders",
      ),
    ).toBe(false);
  });

  it("does not treat placeholder labels or SQL system schemas as environment instances", () => {
    const item = testCase({
      precondition: `1) 项目标识：\${ProjectA}
2) 授权数据源：\${DataSourceA}
3) 数据源类型：GaussDB9.1
4) 存在数据库：\${SchemaA}
5) 创建数据表：
   DROP TABLE IF EXISTS \${SchemaA}.test_table_16178_c0001;
   CREATE TABLE IF NOT EXISTS \${SchemaA}.test_table_16178_c0001 (id BIGINT);
   INSERT INTO \${SchemaA}.test_table_16178_c0001 VALUES (1);`,
      steps: [
        { action: "进入【离线开发 → 数据开发 → 周期任务】页面", expected: "进入成功" },
        {
          action: `执行 SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = '\${SchemaA}'`,
          expected: "查询结果为 1",
        },
      ],
    });
    expect(lintCaseContent(doc(item), config)).toEqual([]);
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
    for (const violation of violations) {
      expect(violation.message).toMatch(
        /^标题: YAML用例存在违规内容，必须整改\.\n预期：.+\n实际：.+\n修复：.+\n要求：语义级重写全部同类内容后重新执行 lint；未通过前不得交由用户验收!$/s,
      );
    }
  });

  it("rejects generic assertion words and the three legacy title formats", () => {
    // Generic assertion word in the result slot → forbidden term
    const generic = testCase({ title: "验证【系统登录】使用账号密码登录，功能正常" });
    expect(lintCaseContent(doc(generic), config).map((item) => item.rule)).toContain(
      "case_forbidden_term",
    );

    // Legacy condition-combination format without comma+result → title format violation
    const legacyCond = testCase({
      title: "验证【系统登录】功能正常(用户名正确 + 密码正确 + 验证码正确)",
    });
    expect(lintCaseContent(doc(legacyCond), config).map((item) => item.rule)).toContain(
      "case_title_format",
    );

    const invalid = testCase({ title: "" });
    const rules = lintCaseContent(doc(invalid), config).map((item) => item.rule);
    expect(rules).toContain("case_title_format");
  });

  it("accepts single formula titles and rejects legacy formats", () => {
    const valid = [
      "验证【单表校验规则】新建强规则并运行，触发强规则告警",
      "验证【周期任务】同步Restful源，任务状态为成功(源URL未配置path)",
      "验证【数据开发】-【周期任务】同步Restful源，任务状态为成功(未配置path)",
      "验证【状态筛选】筛选任务列表，仅展示匹配状态任务(单选场景)",
      "验证【数据地图】搜索框输入，交互元素展示",
    ];
    for (const title of valid) {
      expect(lintCaseContent(doc(testCase({ title })), config)).toEqual([]);
    }
    const legacy = [
      // 旧格式1: 验证【模块】-【操作】描述（无逗号+结果）
      "验证【词根管理】-【被引用】查看标准功能正常",
      // 旧格式2: 在【…】时【…】
      "验证【单表规则】在【枚举值个数超过阈值】时【触发强规则告警】",
      // 旧格式3: 功能正常(A + B)
      "验证【系统登录】功能正常(用户名正确 + 密码正确 + 验证码正确)",
      // 下划线拼接
      "验证【周期任务】同步源，任务状态成功_数据源未配置path",
    ];
    for (const title of legacy) {
      expect(lintCaseContent(doc(testCase({ title })), config).map((item) => item.rule)).toContain(
        "case_title_format",
      );
    }
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
      "预期：进入【一至三级实际菜单路径】页面, e.g. 进入【数据质量 → 规则库配置】页面.",
    );
    expect(violation?.message).toContain("实际：点击新增按钮");
    expect(violation?.message).not.toContain("C0001");
  });

  it("accepts one to three navigation levels and requires first expected to be 进入成功", () => {
    for (const action of [
      "进入【资产盘点】页面",
      "进入【数据质量 → 规则库配置】页面",
      "进入【元数据 → 数据目录 → 属性管理】页面",
    ]) {
      expect(
        lintCaseContent(doc(testCase({ steps: [{ action, expected: "进入成功" }] })), config),
      ).toEqual([]);
    }
    const fourLevels = lintCaseContent(
      doc(
        testCase({
          steps: [
            { action: "进入【平台 → 元数据 → 数据目录 → 属性管理】页面", expected: "进入成功" },
          ],
        }),
      ),
      config,
    );
    expect(fourLevels.map((item) => item.rule)).toContain("case_first_step_navigation");
    const verboseExpected = lintCaseContent(
      doc(testCase({ steps: [{ action: "进入【资产盘点】页面", expected: "页面展示成功" }] })),
      config,
    );
    expect(verboseExpected.map((item) => item.rule)).toContain("case_first_step_expected");
  });

  it("requires numbered preconditions and non-empty action/expected cells", () => {
    const unnumbered = lintCaseContent(
      doc(testCase({ precondition: "存在名称为「规则A」的记录" })),
      config,
    );
    expect(unnumbered.map((item) => item.rule)).toContain("case_precondition_format");
    const discontinuous = lintCaseContent(
      doc(testCase({ precondition: "1) 存在规则A\n3) 规则A状态为「启用」" })),
      config,
    );
    expect(discontinuous.map((item) => item.rule)).toContain("case_precondition_format");
    const emptyCells = lintCaseContent(
      doc(testCase({ steps: [{ action: "进入【资产盘点】页面", expected: "" }] })),
      config,
    );
    expect(emptyCells.map((item) => item.rule)).toContain("case_step_empty");
  });

  it("ignores semicolons inside quoted fixture values when checking packed preconditions", () => {
    const source = `cases:
  - case_id: C0001
    title: 验证【规则库配置】保存规则，展示规则校验内容
    priority: P1
    precondition: 1) 规则校验内容为「key1-key2;key11-key22」
    steps:
      - action: 进入【数据质量 → 规则库配置】页面
        expected: 进入成功
`;
    expect(lintCaseYamlSource(source)).toEqual([]);
  });

  it("requires each action to represent one independently verifiable operation stage", () => {
    const collapsed = lintCaseContent(
      doc(
        testCase({
          steps: [
            { action: "进入【数据标准 → 标准定义】页面", expected: "进入成功" },
            {
              action:
                "1) 点击「导出」并仅选择 L3「客户画像」\n2) 下载导出文件并核对表头与记录\n3) 再次导出一级目录「零售业务」下的全部 L3",
              expected: "导出范围和文件内容与所选目录一致",
            },
          ],
        }),
      ),
      config,
    );
    const violation = collapsed.find((item) => item.rule === "case_action_atomicity");
    expect(violation?.message).toContain(
      "每个 action 只描述一个可独立验收的操作阶段；同一表单的多个字段可合并配置并一次提交",
    );

    const separated = lintCaseContent(
      doc(
        testCase({
          steps: [
            { action: "进入【数据标准 → 标准定义】页面", expected: "进入成功" },
            {
              action: "点击「导出」，仅选择 L3「客户画像」，点击「确定」",
              expected: "导出任务范围仅包含 L3「客户画像」",
            },
            {
              action: "下载导出文件并打开",
              expected: "文件可正常打开",
            },
            {
              action: "核对导出文件的表头与记录",
              expected: "表头字段完整且记录仅属于 L3「客户画像」",
            },
          ],
        }),
      ),
      config,
    );
    expect(separated.map((item) => item.rule)).not.toContain("case_action_atomicity");
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
    const pairWithoutSql = `1) 授权数据源：\${DataSourceA}
2) 数据源类型：SparkThrift2.x
3) 存在数据库：\${SchemaA}`;
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

    const datasourceOnly = `1) 授权数据源：\${DataSourceA}`;
    expect(
      lintCaseContent(doc(testCase({ precondition: datasourceOnly })), config).map(
        (item) => item.rule,
      ),
    ).not.toContain("case_datasource_pair");
  });

  it("allows a declared empty table without INSERT but requires deterministic DROP and CREATE", () => {
    const emptyTable = validSparkPrecondition
      .replace(/\n {3}INSERT INTO[\s\S]*$/, "")
      .replace("4) 创建数据表并插入 2 行数据：", "4) 创建数据表，该表为空表：");
    expect(lintCaseContent(doc(testCase({ precondition: emptyTable })), config)).toEqual([]);

    const missingDrop = validSparkPrecondition.replace(
      `   DROP TABLE IF EXISTS \${SchemaA}.test_table_16178_c0001;\n`,
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
      "   INSERT INTO",
      "   DISTRIBUTED BY HASH(id) BUCKETS 1;\n   INSERT INTO",
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

    const largeOrdinalSet = `${validSparkPrecondition.replaceAll(
      "test_table_16178_c0001",
      "test_table_16178_c0001_source_00001",
    )}
    DROP TABLE IF EXISTS \${SchemaA}.test_table_16178_c0001_source_10000;
    CREATE TABLE IF NOT EXISTS \${SchemaA}.test_table_16178_c0001_source_10000 (id BIGINT);`;
    expect(
      lintCaseContent(doc(testCase({ precondition: largeOrdinalSet })), config).map(
        (item) => item.rule,
      ),
    ).not.toContain("case_sql_table_name");
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

  it("requires range or a complete file generator when inserted rows exceed five", () => {
    const sixValues = validSparkPrecondition
      .replace("插入 2 行数据", "插入 6 行数据")
      .replace(
        "     (2, 20);",
        "     (2, 20),\n     (3, 30),\n     (4, 40),\n     (5, 50),\n     (6, 60);",
      );
    expect(
      lintCaseContent(doc(testCase({ precondition: sixValues })), config).map((item) => item.rule),
    ).toContain("case_bulk_rows");

    const rangeSql = validSparkPrecondition
      .replace("插入 2 行数据", "插入 100 行数据")
      .replace(
        /INSERT INTO[\s\S]*$/,
        `INSERT INTO \${SchemaA}.test_table_16178_c0001 SELECT id, id * 10 FROM range(1, 101);`,
      );
    expect(lintCaseContent(doc(testCase({ precondition: rangeSql })), config)).toEqual([]);
  });

  it("accepts a complete shell SQL generator but rejects scripts that execute external systems", () => {
    const generator = `1) 授权数据源：\${DataSourceA}
2) 数据源类型：SparkThrift2.x
3) 存在数据库：\${SchemaA}
4) 使用以下 Shell 脚本生成 test_table_16178_c0001.sql：
   #!/usr/bin/env bash
   set -euo pipefail
   output_file="test_table_16178_c0001.sql"
   schema='\${SchemaA}'
   table="\${schema}.test_table_16178_c0001"
   {
     printf 'DROP TABLE IF EXISTS %s;\\n' "\${table}"
     printf 'CREATE TABLE IF NOT EXISTS %s (id BIGINT, code STRING);\\n' "\${table}"
     printf 'INSERT INTO %s SELECT id, CONCAT("code_", CAST(id AS STRING)) FROM range(1, 101);\\n' "\${table}"
   } > "\${output_file}"
5) 复制 test_table_16178_c0001.sql 的内容，在 \${DataSourceA} 对应平台或底层执行`;
    expect(lintCaseContent(doc(testCase({ precondition: generator })), config)).toEqual([]);
    const executes = generator.replace(
      `5) 复制 test_table_16178_c0001.sql 的内容，在 \${DataSourceA} 对应平台或底层执行`,
      "5) spark-sql -f test_table_16178_c0001.sql",
    );
    expect(
      lintCaseContent(doc(testCase({ precondition: executes })), config).map((item) => item.rule),
    ).toContain("case_generator_scope");
  });

  it("requires partition tables and two dynamic partitions for partition-related cases", () => {
    const partitionCase = testCase({ title: "验证【分区扫描】执行分区扫描，仅读取指定分区" });
    expect(lintCaseContent(doc(partitionCase), config).map((item) => item.rule)).toContain(
      "case_partition_fixture",
    );
    const partitioned = validSparkPrecondition
      .replace("dept_id BIGINT", "dept_id BIGINT\n   ) PARTITIONED BY (dt STRING")
      .replace(
        `INSERT INTO \${SchemaA}.test_table_16178_c0001 VALUES\n     (1, 10),\n     (2, 20);`,
        `INSERT INTO \${SchemaA}.test_table_16178_c0001 PARTITION (dt)\n   SELECT 1, 10, date_format(date_sub(current_date(), 1), 'yyyy-MM-dd')\n   UNION ALL\n   SELECT 2, 20, date_format(current_date(), 'yyyy-MM-dd');`,
      );
    expect(
      lintCaseContent(doc(partitionCase, "分区扫描需求"), config).map((item) => item.rule),
    ).toContain("case_partition_fixture");
    expect(lintCaseContent(doc({ ...partitionCase, precondition: partitioned }), config)).toEqual(
      [],
    );

    const validGaussPartition = `1) 授权数据源：\${DataSourceA}
2) 数据源类型：GaussDB9.1
3) 存在数据库：\${SchemaA}
4) 创建 GaussDB 分区表并写入前一日和当日两个分区：
   DROP TABLE IF EXISTS \${SchemaA}.test_table_16178_c0001;
   CREATE TABLE IF NOT EXISTS \${SchemaA}.test_table_16178_c0001 (
     id BIGINT,
     dept_id BIGINT,
     dt DATE
   ) PARTITION BY RANGE (dt) (
     PARTITION p_before VALUES LESS THAN (CURRENT_DATE),
     PARTITION p_current VALUES LESS THAN (CURRENT_DATE + INTERVAL '1 day')
   );
   INSERT INTO \${SchemaA}.test_table_16178_c0001 VALUES
     (1, 10, CURRENT_DATE - INTERVAL '1 day'),
     (2, 20, CURRENT_DATE);`;
    expect(
      lintCaseContent(doc({ ...partitionCase, precondition: validGaussPartition }), config),
    ).toEqual([]);
  });

  it("requires complete inline import data and script generation above five rows", () => {
    const incomplete = testCase({ precondition: "1) 创建导入文件 rules.xlsx" });
    expect(lintCaseContent(doc(incomplete), config).map((item) => item.rule)).toContain(
      "case_import_fixture",
    );
    const inline = testCase({
      precondition: `1) 创建导入文件 rules.xlsx：
   Sheet: Sheet1
   Title: * 规则名称, 规则描述, * 表名, 表中文名, 字段名, 字段中文名, * 校验SQL(请输入不符合规则要求的明细数据查询SQL)
   Line1: 金额非空校验, 金额字段不得为空, departments, 部门表, amount, 金额, SELECT * FROM departments WHERE amount IS NULL`,
    });
    expect(lintCaseContent(doc(inline), config)).toEqual([]);
  });

  it("requires SELECT and a deterministic result for SQL validation expectations", () => {
    const item = testCase({
      steps: [
        { action: "进入【数据质量 → 规则库配置】页面", expected: "进入成功" },
        { action: "执行SQL任务校验", expected: "任务状态：「成功」" },
      ],
    });
    expect(lintCaseContent(doc(item), config).map((entry) => entry.rule)).toContain(
      "case_sql_expected",
    );
    item.steps[1] = {
      action: "执行SQL任务校验",
      expected: "执行SQL：SELECT COUNT(*) FROM result_table;\n查询结果：2",
    };
    expect(lintCaseContent(doc(item), config)).toEqual([]);
  });

  it("rejects pure API cases from the functional suite without removing generic executor support", () => {
    const item = testCase({ automation: { executor: "api" } });
    expect(lintCaseContent(doc(item), config).map((entry) => entry.rule)).toContain(
      "case_pure_api",
    );
  });
});
