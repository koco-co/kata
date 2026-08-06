import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  lintCaseContent,
  lintCaseYamlSource,
  loadCasesLintConfig,
  resolveCaseCustomer,
} from "../../cli/lib/cases/content-lint.ts";
import { parseCasesYaml, validateCases } from "../../cli/lib/cases/parse.ts";
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
      { action: "进入【数据质量 → 规则库配置】页面", expected: "进入成功" },
      { action: "点击「新增规则」", expected: "打开新建规则表单" },
      { action: "查看规则列表", expected: "规则已创建" },
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
        { action: "查看规则列表", expected: "规则已创建" },
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

    const userGroup = testCase({
      precondition: `1) 用户「UserA」和用户组「研发组」均存在`,
    });
    const groupViolation = lintCaseContent(doc(userGroup), config).find(
      (item) => item.rule === "case_business_placeholders",
    );
    expect(groupViolation).toBeDefined();
    expect(groupViolation?.message).toContain("研发组 → UserGroupA");
  });

  it("rejects chaining flat DQ modules in tags and allows a single core module", () => {
    const chained = testCase({
      steps: [
        { action: "进入【数据质量 → 规则集管理】页面", expected: "进入成功" },
        { action: "查看校验结果", expected: "展示结果" },
      ],
      tags: ["数据质量", "规则集管理", "规则任务管理", "校验结果查询"],
    });
    const rules = lintCaseContent(doc(chained), config).map((entry) => entry.rule);
    expect(rules).toContain("case_tags_flat_modules");
    const violation = lintCaseContent(doc(chained), config).find(
      (entry) => entry.rule === "case_tags_flat_modules",
    );
    expect(violation?.message).toContain("平级模块串链");
    expect(violation?.message).toContain("规则集管理、规则任务管理");

    // 平级模块被功能细节隔开不算串链
    const separated = testCase({
      steps: [
        { action: "进入【数据质量 → 规则集管理】页面", expected: "进入成功" },
        { action: "查看校验结果", expected: "展示结果" },
      ],
      tags: ["数据质量", "规则集管理", "规则包明细", "校验结果查询"],
    });
    expect(lintCaseContent(doc(separated), config).map((entry) => entry.rule)).not.toContain(
      "case_tags_flat_modules",
    );
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
        { action: "查看周期任务列表", expected: "任务已创建" },
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
        /^标题: YAML用例存在违规内容，必须整改\.\n实际：.+\n修复：.+$/s,
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

  it("rejects bracket content without a judge keyword and accepts judgment expressions", () => {
    // 真条件必须含判断关键字：比较/算术操作符、且或、为空/非空 等
    const goodConditions = [
      "验证【状态筛选】筛选任务列表，仅展示匹配状态任务(状态 = 已发布)",
      "验证【单表校验规则】-【新建监控规则】保存枚举值规则，触发强规则告警(枚举值个数 > 阈值)",
      "验证【数据导出】导出任务，行数完整(行数 ≥ 10000)",
      "验证【行权限】保存行条件，前端阻断第六个条件(行条件 ≤ 5)",
      "验证【引用数据表】配置数据源并映射字段，读取源表数据(数据源 = Hive2.x)",
      "验证【码表管理】新建码表填写上级代码，保存成功(上级代码为空)",
      "验证【行条件】配置两条条件并选择且，只返回同时满足行(且)",
      "验证【字段导入】导入缺字段文件，错误文件批注原因(字段名 = 空)",
      "验证【码表管理】引用数据表，读取成功(=操作符)",
    ];
    for (const title of goodConditions) {
      expect(lintCaseContent(doc(testCase({ title })), config).map((i) => i.rule)).not.toContain(
        "case_title_condition",
      );
    }
    const badLabels = [
      "验证【属性管理】-【删除】删除属性，列表不再展示(逻辑)",
      "验证【属性管理】-【删除】删除弹窗确认，提示删除成功(交互)",
      "验证【目录管理】导出L3目录，按范围导出(L3)",
      "验证【目录管理】编辑目录保存，提交成功(通过)",
      "验证【数据地图】-【导入】上传L5字段文件，导入成功(L5导入失败)",
      "验证【资产盘点】查看数据表列表，展示完整字段(数据表结果)",
      "验证【数据导出】导出任务，180秒内完成(10000行)",
      "验证【行权限】保存行条件，前端阻断第六个条件(5条上限)",
      "验证【标准属性管理】点击入口，展示tab按钮(新增页面)",
    ];
    for (const title of badLabels) {
      const rules = lintCaseContent(doc(testCase({ title })), config).map((i) => i.rule);
      expect(rules).toContain("case_title_condition");
    }
  });

  it("accepts titles without any trailing parentheses", () => {
    expect(
      lintCaseContent(
        doc(testCase({ title: "验证【编码管理】重置编码并确认，编码信息重置为初始值" })),
        config,
      ),
    ).toEqual([]);
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
    expect(violation?.message).toContain("实际：点击新增按钮");
    expect(violation?.message).toContain("修复：将首步骤 action 改为");
    expect(violation?.message).not.toContain("C0001");
  });

  it("accepts one to three navigation levels and requires first expected to be 进入成功", () => {
    for (const action of [
      "进入【资产盘点】页面",
      "进入【数据质量 → 规则库配置】页面",
      "进入【元数据 → 数据目录 → 属性管理】页面",
    ]) {
      expect(
        lintCaseContent(
          doc(
            testCase({
              steps: [
                { action, expected: "进入成功" },
                { action: "查看规则列表", expected: "规则列表展示 1 条记录" },
                { action: "确认状态", expected: "状态显示为「启用」" },
              ],
            }),
          ),
          config,
        ),
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

  it("flags double-quoted preconditions using \\n escapes instead of |-", () => {
    const source = `cases:
  - case_id: C0001
    title: 验证【编码配置】保存，展示结果
    priority: P1
    precondition: "1) 存在数据库：\${SchemaA}\\n2) 已创建数据表"
    steps:
      - action: 进入【数据资产】页面
        expected: 进入成功
`;
    const violations = lintCaseYamlSource(source);
    expect(violations.map((item) => item.rule)).toContain("case_block_scalar");
  });

  it("flags single-quoted multi-line actions wrapped in quotes instead of |-", () => {
    const source = `cases:
  - case_id: C0001
    title: 验证【编码配置】保存，展示结果
    priority: P1
    precondition: 无
    steps:
      - action: '1）新增一个目录；

          2）再次查看当前编码值'
        expected: 进入成功
`;
    const violations = lintCaseYamlSource(source);
    expect(violations.map((item) => item.rule)).toContain("case_block_scalar");
  });

  it("flags multi-line expected values wrapped in quotes", () => {
    const source = `cases:
  - case_id: C0001
    title: 验证【编码配置】保存，展示结果
    priority: P1
    precondition: 无
    steps:
      - action: 进入【数据资产】页面
        expected: '1）列表新增记录；

          2）状态为「启用」'
`;
    expect(lintCaseYamlSource(source).map((item) => item.rule)).toContain("case_block_scalar");
  });

  it("allows |- block scalars and single-line quoted content containing quotes", () => {
    const source = `cases:
  - case_id: C0001
    title: 验证【编码配置】保存，展示结果
    priority: P1
    precondition: |-
      1) 存在数据库：\${SchemaA}
      2) 已创建数据表
    steps:
      - action: 进入【数据资产】页面
        expected: '提示: ''保存成功'''
`;
    expect(lintCaseYamlSource(source)).toEqual([]);
  });

  it("keeps single-line quoted meta and requirement id values untouched", () => {
    const source = `meta: { title: 需求, requirement_id: '16178', case_module_id: 'data-standard' }
cases:
  - case_id: C0001
    title: 验证【编码配置】保存，展示结果
    priority: P1
    precondition: 无
    steps:
      - action: 进入【数据资产】页面
        expected: 进入成功
`;
    expect(lintCaseYamlSource(source)).toEqual([]);
  });

  it("allows single-line quoted content that contains backslash-n as literal text", () => {
    const source = `cases:
  - case_id: C0001
    title: 验证【编码配置】保存，展示结果
    priority: P1
    precondition: 无
    steps:
      - action: 进入【数据资产】页面
        expected: '描述使用 \\n 表示换行'
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

  it("requires each case to have at least 3 steps, suggesting merge or additions otherwise", () => {
    const short = lintCaseContent(
      doc(
        testCase({
          steps: [
            { action: "进入【数据质量 → 规则库配置】页面", expected: "进入成功" },
            { action: "查看规则列表", expected: "规则已创建" },
          ],
        }),
      ),
      config,
    );
    const violation = short.find((item) => item.rule === "case_min_steps");
    expect(violation?.message).toContain("实际：步骤数 = 2（< 3）");
    expect(violation?.message).toContain("修复：补充可独立验收的步骤");

    const enough = lintCaseContent(
      doc(
        testCase({
          steps: [
            { action: "进入【数据质量 → 规则库配置】页面", expected: "进入成功" },
            { action: "点击「新增规则」", expected: "打开新建规则表单" },
            { action: "查看规则列表", expected: "规则已创建" },
          ],
        }),
      ),
      config,
    );
    expect(enough.map((item) => item.rule)).not.toContain("case_min_steps");
  });

  it("treats numbered form fields inside one action as a single operation stage", () => {
    const violations = lintCaseContent(
      doc(
        testCase({
          steps: [
            { action: "进入【离线开发 → 数据开发 → 函数管理】页面", expected: "进入成功" },
            {
              action:
                "新建GaussDB 存储过程, 配置如下:\n1) 存储过程名称: proc_account_summary\n2) SQL:\nCREATE OR REPLACE PROCEDURE ${项目标识}.proc_account_summary();",
              expected: "Toast提示: 创建成功",
            },
          ],
        }),
      ),
      config,
    );
    expect(violations.map((item) => item.rule)).not.toContain("case_action_atomicity");
  });

  it("flags custom project names with legacy/new/demo suffixes", () => {
    const violations = lintCaseContent(
      doc(
        testCase({
          steps: [
            { action: "进入【数据质量】页面", expected: "进入成功" },
            { action: "新建项目 quality_menu_legacy 并打开", expected: "打开成功" },
          ],
        }),
      ),
      config,
    );
    expect(violations.map((item) => item.rule)).toContain("case_environment_placeholders");
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

  it("requires SQL for a datasource/schema pair and blocks unpaired SQL from bypassing contracts", () => {
    const pairWithoutSql = `1) 授权数据源：\${DataSourceA}
2) 数据源类型：SparkThrift2.x
3) 存在数据库：\${SchemaA}`;
    expect(
      lintCaseContent(doc(testCase({ precondition: pairWithoutSql })), config).map(
        (item) => item.rule,
      ),
    ).toContain("case_datasource_sql");

    const sqlWithoutPair = `1) 建表语句：
   DROP TABLE IF EXISTS legacy_table;
   CREATE TABLE IF NOT EXISTS legacy_table (id BIGINT);`;
    const unpaired = lintCaseContent(doc(testCase({ precondition: sqlWithoutPair })), config).map(
      (item) => item.rule,
    );
    expect(unpaired).toContain("case_datasource_pair");
    expect(unpaired).toContain("case_sql_table_name");

    const unpairedSixValues = `${sqlWithoutPair}
INSERT INTO legacy_table VALUES (1, 10), (2, 20), (3, 30), (4, 40), (5, 50), (6, 60);`;
    const unpairedRows = lintCaseContent(
      doc(testCase({ precondition: unpairedSixValues })),
      config,
    ).map((item) => item.rule);
    expect(unpairedRows).toContain("case_datasource_pair");
    expect(unpairedRows).toContain("case_bulk_rows");

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

  it("accepts the lint-suggested none id through parse, validate and content lint", () => {
    const noneId = `meta: { title: 无需求 id 用例, requirement_id: "none", case_module_id: "" }
cases:
  - case_id: C0001
    title: 验证【数据质量】-【规则库配置】保存规则，列表新增记录并显示启用状态
    priority: P0
    precondition: |-
      1) 授权数据源：\${DataSourceA}
      2) 数据源类型：SparkThrift2.x
      3) 存在数据库：\${SchemaA}
      4) 建表语句：
         DROP TABLE IF EXISTS \${SchemaA}.test_table_none_c0001;
         CREATE TABLE IF NOT EXISTS \${SchemaA}.test_table_none_c0001 (id BIGINT);
         INSERT INTO \${SchemaA}.test_table_none_c0001 VALUES (1);
    steps:
      - action: 进入【数据质量 → 规则库配置】页面
        expected: 进入成功
      - action: 点击「新增规则」
        expected: 打开新建规则表单
      - action: 查看规则列表
        expected: 规则已创建
`;
    const parsed = parseCasesYaml(noneId);
    expect(validateCases(parsed)).toEqual([]);
    expect(lintCaseContent(parsed, config)).toEqual([]);
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

  it("counts only top-level VALUES row tuples, ignoring function arguments and quoted parens", () => {
    const oneRowWithFunctions = `1) 建表语句：
   CREATE TABLE \${SchemaA}.test_table_16178_c0001 (id BIGINT);
   INSERT INTO \${SchemaA}.test_table_16178_c0001 VALUES
     (1, coalesce(null, 10), upper('a(b)c'), current_date());
   SELECT * FROM \${SchemaA}.test_table_16178_c0001;`;
    expect(
      lintCaseContent(doc(testCase({ precondition: oneRowWithFunctions })), config).map(
        (item) => item.rule,
      ),
    ).not.toContain("case_bulk_rows");

    const sixRowsWithFunctions = `1) 建表语句：
   CREATE TABLE \${SchemaA}.test_table_16178_c0001 (id BIGINT);
   INSERT INTO \${SchemaA}.test_table_16178_c0001 VALUES
     (1, current_date()),
     (2, current_date()),
     (3, current_date()),
     (4, current_date()),
     (5, current_date()),
     (6, current_date());`;
    const withFunctions = lintCaseContent(
      doc(testCase({ precondition: sixRowsWithFunctions })),
      config,
    );
    expect(withFunctions.map((item) => item.rule)).toContain("case_bulk_rows");
    expect(withFunctions.find((item) => item.rule === "case_bulk_rows")?.message).toContain("6 行");
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

    const previousOnly = `1) 授权数据源：\${DataSourceA}
2) 数据源类型：SparkThrift2.x
3) 存在数据库：\${SchemaA}
4) 创建分区表并写入前一日分区：
   DROP TABLE IF EXISTS \${SchemaA}.test_table_16178_c0001;
   CREATE TABLE \${SchemaA}.test_table_16178_c0001 (id BIGINT, dt STRING) PARTITIONED BY (dt STRING);
   INSERT INTO \${SchemaA}.test_table_16178_c0001 PARTITION (dt)
   SELECT 1, date_format(date_sub(current_date(), 1), 'yyyy-MM-dd');`;
    const previousViolation = lintCaseContent(
      doc({ ...partitionCase, precondition: previousOnly }),
      config,
    ).find((item) => item.rule === "case_partition_fixture");
    expect(previousViolation).toBeDefined();
    expect(previousViolation?.message).toContain("当日动态分区=否");

    const currentOnly = `1) 授权数据源：\${DataSourceA}
2) 数据源类型：SparkThrift2.x
3) 存在数据库：\${SchemaA}
4) 创建分区表并写入当日分区：
   DROP TABLE IF EXISTS \${SchemaA}.test_table_16178_c0001;
   CREATE TABLE \${SchemaA}.test_table_16178_c0001 (id BIGINT, dt STRING) PARTITIONED BY (dt STRING);
   INSERT INTO \${SchemaA}.test_table_16178_c0001 PARTITION (dt)
   SELECT 1, date_format(current_date(), 'yyyy-MM-dd');`;
    expect(
      lintCaseContent(doc({ ...partitionCase, precondition: currentOnly }), config).map(
        (item) => item.rule,
      ),
    ).toContain("case_partition_fixture");
  });

  it("requires explicit partition selection and one-pass-one-fail partition data split", () => {
    const base = `1) 授权数据源：\${DataSourceA}
2) 数据源类型：SparkThrift2.x
3) 存在数据库：\${SchemaA}
4) 创建分区表并写入前一日和当日两个分区：
   DROP TABLE IF EXISTS \${SchemaA}.test_table_16178_c0001;
   CREATE TABLE IF NOT EXISTS \${SchemaA}.test_table_16178_c0001 (id BIGINT, month STRING, sales BIGINT, dt STRING) PARTITIONED BY (dt);
   INSERT INTO \${SchemaA}.test_table_16178_c0001 PARTITION (dt)
   SELECT 1, '2026-01', 100, date_format(date_sub(current_date(), 1), 'yyyy-MM-dd')
   UNION ALL SELECT 2, '2026-02', 200, date_format(date_sub(current_date(), 1), 'yyyy-MM-dd');
   INSERT INTO \${SchemaA}.test_table_16178_c0001 PARTITION (dt)
   SELECT 3, '2026-01', 100, date_format(current_date(), 'yyyy-MM-dd')
   UNION ALL SELECT 4, '2026-02', 80, date_format(current_date(), 'yyyy-MM-dd');`;

    const vague = testCase({
      precondition: base,
      steps: [
        { action: "进入【数据质量 → 规则任务管理】页面", expected: "进入成功" },
        { action: "点击「新建规则任务」", expected: "打开向导" },
        {
          action: `新建监控任务：
* 规则名称：RuleA
* 选择数据源：\${DataSourceA}
* 选择数据库：\${SchemaA}
* 选择数据表：test_table_16178_c0001
选择分区：选择已有分区
抽样检查设置：百分比抽样50%`,
          expected: "进入「监控规则」步骤",
        },
      ],
    });
    const rules = lintCaseContent(doc(vague, "分区扫描需求"), config).map((item) => item.rule);
    expect(rules).toContain("case_partition_data_split");
    const violation = lintCaseContent(doc(vague, "分区扫描需求"), config).find(
      (item) => item.rule === "case_partition_data_split",
    );
    expect(violation?.message).toContain("选择分区");

    const explicit = testCase({
      precondition: base,
      steps: [
        { action: "进入【数据质量 → 规则任务管理】页面", expected: "进入成功" },
        { action: "点击「新建规则任务」", expected: "打开向导" },
        {
          action: `新建监控任务：
* 规则名称：RuleA
* 选择数据源：\${DataSourceA}
* 选择数据库：\${SchemaA}
* 选择数据表：test_table_16178_c0001
选择分区：选择已有分区(dt=2026-08-05)
抽样检查设置：百分比抽样50%`,
          expected: "进入「监控规则」步骤",
        },
      ],
    });
    const passCase = testCase({
      precondition: base,
      title: "验证【数据变化趋势】前一日分区为正确数据，当日分区为异常数据，选择当日分区校验不通过",
      steps: [
        { action: "进入【数据质量 → 规则任务管理】页面", expected: "进入成功" },
        { action: "点击「新建规则任务」", expected: "打开向导" },
        {
          action: `新建监控任务：
* 规则名称：RuleA
* 选择数据源：\${DataSourceA}
* 选择数据库：\${SchemaA}
* 选择数据表：test_table_16178_c0001
选择分区：选择已有分区(dt=2026-08-05)
抽样检查设置：百分比抽样50%`,
          expected: "进入「监控规则」步骤",
        },
        { action: "查看 TaskA 最新实例校验结果", expected: "实例校验结果为「校验不通过」" },
      ],
    });
    expect(
      lintCaseContent(doc(passCase, "分区扫描需求"), config).map((item) => item.rule),
    ).not.toContain("case_partition_data_split");
    expect(
      lintCaseContent(doc(explicit, "分区扫描需求"), config).map((item) => item.rule),
    ).not.toContain("case_partition_data_split");
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
        { action: "查看规则列表", expected: "规则已创建" },
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

  it("rejects config actions and rule detail declarations in preconditions", () => {
    const item = testCase({
      precondition: `1) 授权数据源：\${DataSourceA}
2) 数据源类型：SparkThrift2.x
3) 存在数据库：\${SchemaA}
4) 创建数据表并插入数据：
   DROP TABLE IF EXISTS \${SchemaA}.test_table_16178_c0001;
   INSERT INTO \${SchemaA}.test_table_16178_c0001 VALUES (1, 10);
5) 存在规则任务 TaskA，监控表 test_table_16178_c0001，规则：合理性校验-数据变化趋势，校验字段 sales，排序字段 month，校验方法单调递增，维度字段 vin
6) 点击该规则任务「立即执行」`,
    });
    const rules = lintCaseContent(doc(item), config).map((entry) => entry.rule);
    expect(rules.filter((rule) => rule === "case_precondition_config_action")).toHaveLength(2);
  });

  it("accepts data preparation verbs in preconditions", () => {
    const item = testCase({
      precondition: `1) 授权数据源：\${DataSourceA}
2) 数据源类型：SparkThrift2.x
3) 存在数据库：\${SchemaA}
4) 创建数据表并插入 2 行数据：
   DROP TABLE IF EXISTS \${SchemaA}.test_table_16178_c0001;
   CREATE TABLE IF NOT EXISTS \${SchemaA}.test_table_16178_c0001 (id BIGINT);
   INSERT INTO \${SchemaA}.test_table_16178_c0001 VALUES (1), (2);
5) 使用以下 Shell 脚本生成 test_table_16178_c0001.sql：
   #!/usr/bin/env bash
   set -euo pipefail
   output_file="test_table_16178_c0001.sql"
6) 复制 test_table_16178_c0001.sql 的内容，在 \${DataSourceA} 对应平台或底层执行`,
    });
    expect(lintCaseContent(doc(item), config)).toEqual([]);
  });

  it("requires a complete rule set form in the new rule set action", () => {
    const missing = testCase({
      steps: [
        { action: "进入【数据质量 → 规则集管理】页面", expected: "进入成功" },
        {
          action:
            "点击「新建规则集」，填写规则集名称「RuleSetA」，选择 ${DataSourceA}、${SchemaA}、test_table_16178_c0001",
          expected: "进入规则配置步骤",
        },
      ],
    });
    const rules = lintCaseContent(doc(missing), config, "ltqc").map((entry) => entry.rule);
    expect(rules).toContain("case_rule_set_form");
    const violation = lintCaseContent(doc(missing), config, "ltqc").find(
      (entry) => entry.rule === "case_rule_set_form",
    );
    expect(violation?.message).toContain("缺少配置项");
    expect(violation?.message).toContain("规则集描述");

    const complete = testCase({
      steps: [
        { action: "进入【数据质量 → 规则集管理】页面", expected: "进入成功" },
        {
          action: `点击「新建规则集」，配置如下：
* 规则集名称：RuleSetA
* 选择数据源：\${DataSourceA}
* 选择数据库：\${SchemaA}
* 选择数据表：test_table_16178_c0001
规则集描述：维度字段验证
点击「下一步」`,
          expected: "进入规则配置步骤，基础信息回显规则集名称、描述、数据源、数据库和数据表",
        },
      ],
    });
    expect(lintCaseContent(doc(complete), config, "ltqc").map((entry) => entry.rule)).not.toContain(
      "case_rule_set_form",
    );
  });

  it("requires a complete schedule form in the schedule action", () => {
    const missing = testCase({
      steps: [
        { action: "进入【数据质量 → 规则任务管理】页面", expected: "进入成功" },
        {
          action: "配置「调度属性」，设置「规则拼接包」为「10」，保存规则",
          expected: "规则保存成功",
        },
      ],
    });
    const rules = lintCaseContent(doc(missing), config, "ltqc").map((entry) => entry.rule);
    expect(rules).toContain("case_schedule_form");
    const violation = lintCaseContent(doc(missing), config, "ltqc").find(
      (entry) => entry.rule === "case_schedule_form",
    );
    expect(violation?.message).toContain("缺少配置项");
    expect(violation?.message).toContain("调度周期");

    const complete = testCase({
      steps: [
        { action: "进入【数据质量 → 规则任务管理】页面", expected: "进入成功" },
        {
          action: `配置调度属性：
* 调度周期：手动触发
* 规则拼接包：10
* 资源组：默认资源组
* 超时时间：不限制
告警方式：无
无需生成报告：不勾选
报告名称：质量报告A`,
          expected: "调度属性配置完成，规则任务保存成功，执行周期为手动触发",
        },
      ],
    });
    expect(lintCaseContent(doc(complete), config, "ltqc").map((entry) => entry.rule)).not.toContain(
      "case_schedule_form",
    );
  });

  it("requires mandatory * markers and full fields in the monitor object form", () => {
    const noStar = testCase({
      steps: [
        { action: "进入【数据质量 → 规则任务管理】页面", expected: "进入成功" },
        {
          action: `配置监控对象：
数据源：\${DataSourceA}
数据库：\${SchemaA}
数据表：test_table_16178_c0001
点击「下一步」`,
          expected: "进入「监控规则」步骤",
        },
      ],
    });
    const starRules = lintCaseContent(doc(noStar), config, "ltqc").map((entry) => entry.rule);
    expect(starRules).toContain("case_monitor_object_form");
    const starViolation = lintCaseContent(doc(noStar), config, "ltqc").find(
      (entry) => entry.rule === "case_monitor_object_form",
    );
    expect(starViolation?.message).toContain("缺少必填 * 标志");
    expect(starViolation?.message).toContain("数据源");

    const missingField = testCase({
      steps: [
        { action: "进入【数据质量 → 规则任务管理】页面", expected: "进入成功" },
        {
          action: `配置监控对象：
* 数据源：\${DataSourceA}
* 数据表：test_table_16178_c0001
点击「下一步」`,
          expected: "进入「监控规则」步骤",
        },
      ],
    });
    const missingRules = lintCaseContent(doc(missingField), config, "ltqc").map(
      (entry) => entry.rule,
    );
    expect(missingRules).toContain("case_monitor_object_form");
    const missingViolation = lintCaseContent(doc(missingField), config, "ltqc").find(
      (entry) => entry.rule === "case_monitor_object_form",
    );
    expect(missingViolation?.message).toContain("缺少配置项");
    expect(missingViolation?.message).toContain("数据库");

    const complete = testCase({
      steps: [
        { action: "进入【数据质量 → 规则任务管理】页面", expected: "进入成功" },
        {
          action: `配置监控对象：
* 数据源：\${DataSourceA}
* 数据库：\${SchemaA}
* 数据表：test_table_16178_c0001
点击「下一步」`,
          expected: "进入「监控规则」步骤",
        },
      ],
    });
    expect(lintCaseContent(doc(complete), config, "ltqc").map((entry) => entry.rule)).not.toContain(
      "case_monitor_object_form",
    );
  });

  it("requires the full monitor task form with rule name and optional partition/sampling fields", () => {
    const missingTask = testCase({
      steps: [
        { action: "进入【数据质量 → 规则任务管理】页面", expected: "进入成功" },
        {
          action: `新建规则任务：
* 选择数据源：\${DataSourceA}
* 选择数据库：\${SchemaA}
* 选择数据表：test_table_16178_c0001
点击「下一步」`,
          expected: "进入「监控规则」步骤",
        },
      ],
    });
    const rules = lintCaseContent(doc(missingTask), config, "ltqc").map((entry) => entry.rule);
    expect(rules).toContain("case_monitor_task_form");
    const violation = lintCaseContent(doc(missingTask), config, "ltqc").find(
      (entry) => entry.rule === "case_monitor_task_form",
    );
    expect(violation?.message).toContain("缺少配置项");
    expect(violation?.message).toContain("规则名称");

    const completeTask = testCase({
      steps: [
        { action: "进入【数据质量 → 规则任务管理】页面", expected: "进入成功" },
        {
          action: `新建规则任务：
* 规则名称：TaskA
* 选择数据源：\${DataSourceA}
* 选择数据库：\${SchemaA}
* 选择数据表：test_table_16178_c0001
选择分区：空
抽样检查设置：空
点击「下一步」`,
          expected: "进入「监控规则」步骤",
        },
      ],
    });
    expect(
      lintCaseContent(doc(completeTask), config, "ltqc").map((entry) => entry.rule),
    ).not.toContain("case_monitor_task_form");
  });

  it("requires rule package import form with package and type", () => {
    const missingImport = testCase({
      steps: [
        { action: "进入【数据质量 → 规则任务管理】页面", expected: "进入成功" },
        { action: "点击「引入规则包」，选择 RuleSetA 的规则包 packA", expected: "规则包展示成功" },
      ],
    });
    const rules = lintCaseContent(doc(missingImport), config, "ltqc").map((entry) => entry.rule);
    expect(rules).toContain("case_rule_package_import");
    const violation = lintCaseContent(doc(missingImport), config, "ltqc").find(
      (entry) => entry.rule === "case_rule_package_import",
    );
    expect(violation?.message).toContain("缺少配置项");
    expect(violation?.message).toContain("规则包");

    const completeImport = testCase({
      steps: [
        { action: "进入【数据质量 → 规则任务管理】页面", expected: "进入成功" },
        {
          action: `引入规则包：
* 规则包：packA
* 规则类型：全部
点击「引入」并「确定」`,
          expected: "规则包区域展示 packA，规则行数量为 1",
        },
      ],
    });
    expect(
      lintCaseContent(doc(completeImport), config, "ltqc").map((entry) => entry.rule),
    ).not.toContain("case_rule_package_import");
  });

  it("applies zszq monitor object fields by default and does not mis-apply ltqc 数据库", () => {
    // zszq（标品）监控对象：规则名称/选择数据源/选择数据表必填带 *；无「数据库」字段。
    const complete = testCase({
      steps: [
        { action: "进入【数据质量 → 规则配置】页面", expected: "进入成功" },
        {
          action: `配置监控对象：
* 规则名称：RuleA
* 选择数据源：\${DataSourceA}
* 选择数据表：test_table_16212_c0001
点击「下一步」`,
          expected: "进入「监控规则」步骤",
        },
      ],
    });
    // 默认 zszq：不强制「数据库」字段。
    expect(lintCaseContent(doc(complete), config).map((entry) => entry.rule)).not.toContain(
      "case_monitor_object_form",
    );
    // 缺「规则名称」时按 zszq 字段集报缺失。
    const missingName = testCase({
      steps: [
        { action: "进入【数据质量 → 规则配置】页面", expected: "进入成功" },
        {
          action: `配置监控对象：
* 选择数据源：\${DataSourceA}
* 选择数据表：test_table_16212_c0001
点击「下一步」`,
          expected: "进入「监控规则」步骤",
        },
      ],
    });
    const rules = lintCaseContent(doc(missingName), config).map((entry) => entry.rule);
    expect(rules).toContain("case_monitor_object_form");
    const violation = lintCaseContent(doc(missingName), config).find(
      (entry) => entry.rule === "case_monitor_object_form",
    );
    expect(violation?.message).toContain("缺少配置项");
    expect(violation?.message).toContain("规则名称");
  });

  it("applies zszq schedule and rule set fields with 生效日期/校验数据源 baseline", () => {
    // zszq 调度：仅调度周期必填；生效日期/告警方式可空。
    const schedule = testCase({
      steps: [
        { action: "进入【数据质量 → 规则配置】页面", expected: "进入成功" },
        {
          action: `配置调度属性：
* 调度周期：自定义调度日期
自定义调度日期：调度日历A
点击「保存」`,
          expected: "Toast提示:「保存成功」",
        },
      ],
    });
    expect(lintCaseContent(doc(schedule), config).map((entry) => entry.rule)).not.toContain(
      "case_schedule_form",
    );
    // 缺「调度周期」时报缺失。
    const noPeriod = testCase({
      steps: [
        { action: "进入【数据质量 → 规则配置】页面", expected: "进入成功" },
        { action: "配置调度属性：自定义调度日期：调度日历A", expected: "保存成功" },
      ],
    });
    expect(
      lintCaseContent(doc(noPeriod), config).find((entry) => entry.rule === "case_schedule_form")
        ?.message,
    ).toContain("调度周期");

    // zszq 规则集基础信息：规则集名称/校验数据源/规则集描述（无 选择数据库/选择数据表）。
    const ruleSet = testCase({
      steps: [
        { action: "进入【数据质量 → 规则配置】页面", expected: "进入成功" },
        {
          action: `新建规则集：
* 规则集名称：RuleSetA
* 校验数据源：\${DataSourceA}
规则集描述：空
点击「下一步」`,
          expected: "进入规则内容步骤",
        },
      ],
    });
    expect(lintCaseContent(doc(ruleSet), config).map((entry) => entry.rule)).not.toContain(
      "case_rule_set_form",
    );
  });

  it("blocks delivery/deployment/migration status notes in preconditions", () => {
    const dependencyNote = testCase({
      precondition: `1) 授权数据源：\${DataSourceA}
2) 数据源类型：StarRocks3.x
3) 环境依赖：测试环境已部署 zszq 自定义调度日期后端迁移（PeriodType 新增周期 6）`,
      steps: [{ action: "进入【数据质量 → 规则配置】页面", expected: "进入成功" }],
    });
    const rules = lintCaseContent(doc(dependencyNote), config).map((entry) => entry.rule);
    expect(rules).toContain("case_precondition_dependency_note");
    const violation = lintCaseContent(doc(dependencyNote), config).find(
      (entry) => entry.rule === "case_precondition_dependency_note",
    );
    expect(violation?.message).toContain("环境依赖");

    // 交付状态短语（后端迁移/未合入/待迁移）同样拦截。
    const migrationStatus = testCase({
      precondition: `1) 规则任务「TaskA」已配置完整性校验，后端迁移未合入前不可执行`,
      steps: [{ action: "进入【数据质量 → 任务查询】页面", expected: "进入成功" }],
    });
    expect(lintCaseContent(doc(migrationStatus), config).map((entry) => entry.rule)).toContain(
      "case_precondition_dependency_note",
    );

    // 正常数据准备前置不误伤。
    const clean = testCase({
      precondition: `1) 授权数据源：\${DataSourceA}
2) 数据源类型：StarRocks3.x
3) 存在数据库：\${SchemaA}
4) 创建数据表并插入数据：
   DROP TABLE IF EXISTS \${SchemaA}.test_table_16035_c0001;`,
      steps: [{ action: "进入【数据质量 → 规则配置】页面", expected: "进入成功" }],
    });
    expect(lintCaseContent(doc(clean), config).map((entry) => entry.rule)).not.toContain(
      "case_precondition_dependency_note",
    );
  });

  it("resolves customer from feature dir name and infers ltqc from case content when no marker", () => {
    expect(resolveCaseCustomer("/p/【15913】【岚图汽车】【数据质量】x")).toBe("ltqc");
    expect(resolveCaseCustomer("/p/【16212】【浙商证券】【数据质量】x")).toBe("zszq");
    expect(resolveCaseCustomer("/p/【16208】【标品】【数据标准】x")).toBe("zszq");
    // 无显式客户标识：内容含 ltqc 专属菜单/字段视为 ltqc。
    const dir = mkdtempSync(join(tmpdir(), "kata-customer-"));
    try {
      const cases = join(dir, "cases");
      mkdirSync(cases);
      writeFileSync(
        join(cases, "cases.yaml"),
        "cases:\n  - title: 验证【规则任务管理】新建规则任务\n",
      );
      expect(resolveCaseCustomer(dir)).toBe("ltqc");
      writeFileSync(join(cases, "cases.yaml"), "cases:\n  - title: 验证【任务查询】查看实例\n");
      expect(resolveCaseCustomer(dir)).toBe("zszq");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("attaches case id and title to per-case content violations", () => {
    const item = testCase({
      steps: [{ action: "点击新增按钮", expected: "打开新增弹窗" }],
    });
    const violation = lintCaseContent(doc(item), config).find(
      (entry) => entry.rule === "case_first_step_navigation",
    );
    expect(violation?.case_id).toBe("C0001");
    expect(violation?.case_title).toBe(item.title);
  });

  it("attaches case id to source-level precondition violations", () => {
    const source = `meta:
  title: 示例需求
  case_module_id: ''
cases:
- case_id: C0359
  title: 验证【模块】-【功能点】查看数据，列表展示结果
  priority: P0
  precondition: 1) UserA 已登录；UserB 已登录
  steps: []
`;
    const violation = lintCaseYamlSource(source).find(
      (entry) => entry.rule === "case_precondition_semicolon",
    );
    expect(violation?.case_id).toBe("C0359");
  });
});
