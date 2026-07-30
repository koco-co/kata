// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7452,#L7575,#L7632,#L7924,#L7945,#L7966,#L8382,#L8402
// intent: SR-INTENT-2099-01-DQ-001
// probe: SR-UI-PROBE-20260522-DQ-001
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-22T09:36:45Z
import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { expectDataQualityOverviewShell, expectDataQualityMenuRenameContract, expectMetadataIntegrityShell } from "../pages/data-quality/overview";
import { expectDataQualityReportShell } from "../pages/data-quality/reports";
import { expectDataQualityResultShell } from "../pages/data-quality/results";
import { expectDataQualityRuleBaseBuiltInRulesShell, expectDataQualityRuleBaseBuiltInExportContract, expectDataQualityRuleBaseBuiltInStatusToggleContract, expectDataQualityRuleBaseCustomRegexAddContract, expectDataQualityRuleBaseCustomRegexEditDetailDeleteContract, expectDataQualityRuleBaseCustomSqlBasicInfoSaveContract, expectDataQualityRuleBaseCustomSqlDetailEditProtectionContract, expectDataQualityRuleBaseCustomSqlParamConfigContract, expectDataQualityRuleBaseReferencedCustomRegexDeleteProtectionContract, expectDataQualityRuleBaseShell } from "../pages/data-quality/rule-library";
import { expectDataQualityRuleSetShell } from "../pages/data-quality/rule-sets";
import { expectDataQualityRuleShell } from "../pages/data-quality/rule-tasks";

test.setTimeout(3 * 60 * 1000);

test("【P0/P1/P2】数据质量菜单、规则任务、报告与规则库 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入数据质量总览 → 菜单与概览统计模块可见", async () => {
    await expectDataQualityOverviewShell(page, "SR-2099-01-DQ-001");
  });

  await step("步骤2: 进入规则任务管理 → 列表字段与新建入口可见", async () => {
    await expectDataQualityRuleShell(page, "SR-2099-01-DQ-001");
  });

  await step("步骤3: 进入校验结果查询 → 执行结果列表字段可见", async () => {
    await expectDataQualityResultShell(page, "SR-2099-01-DQ-001");
  });

  await step("步骤4: 进入数据质量报告 → 报告配置列表和新增入口可见", async () => {
    await expectDataQualityReportShell(page, "SR-2099-01-DQ-001");
  });

  await step("步骤5: 进入规则集管理和规则库配置 → 规则集/规则库 Shell 可见", async () => {
    await expectDataQualityRuleSetShell(page, "SR-2099-01-DQ-001");
    await expectDataQualityRuleBaseShell(page, "SR-2099-01-DQ-001");
  });

  await step("步骤6: 进入元数据质量完整度分析 → 质量统计和分析列表可见", async () => {
    await expectMetadataIntegrityShell(page, "SR-2099-01-DQ-001");
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7575,#L7632
// intent: SR-2099-01-DQ-RULEBASE-001
// probe: results/20260523-1500-mf-quality-rulebase-01/playwright/ui-probe/probe.json
test("【P0】数据质量规则库内置规则展示、搜索、筛选与新增分类可核验", async ({ page, step }) => {
  await step("步骤1: 进入规则库配置内置规则列表 → 列表、搜索、分类筛选、关联范围筛选与新增规则可核验", async () => {
    await expectDataQualityRuleBaseBuiltInRulesShell(page, "SR-2099-01-DQ-RULEBASE-001");
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7594
// intent: SR-2099-01-DQ-RULEBASE-STATUS-001
// probe: SR-UI-PROBE-20260527-DQ-RULEBASE-STATUS-001
test("【P0】数据质量规则库内置规则状态关闭开启与规则集可选性可核验", async ({ page, step }) => {
  await step("步骤1: 进入规则库配置内置规则列表 → 关闭目标规则、验证规则集不可选择、再开启并恢复可选择", async () => {
    await expectDataQualityRuleBaseBuiltInStatusToggleContract(
      page,
      "SR-2099-01-DQ-RULEBASE-STATUS-L7594",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7613
// intent: SR-2099-01-DQ-RULEBASE-EXPORT-001
// probe: SR-UI-PROBE-20260527-DQ-RULEBASE-EXPORT-001
test("【P0】数据质量规则库内置规则导出文件内容可核验", async ({ page, step }) => {
  test.fail(true, "ltqc-local 导出文件缺少 Archive 预期的「规则状态」列，保留断言暴露产品差异");
  await step("步骤1: 进入规则库配置内置规则列表 → 导出规则库并校验 xlsx 文件字段与规则内容", async () => {
    await expectDataQualityRuleBaseBuiltInExportContract(page, "SR-2099-01-DQ-RULEBASE-EXPORT-L7613");
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7651
// intent: SR-2099-01-DQ-RULEBASE-REGEX-ADD-001
// probe: SR-UI-PROBE-20260527-DQ-RULEBASE-REGEX-ADD-001
test("【P0】数据质量规则库自定义正则新增、匹配测试与规则集可选性可核验", async ({ page, step }) => {
  await step("步骤1: 进入自定义正则页 → 新增车辆 VIN 正则、匹配测试、保存并验证规则集可选择", async () => {
    await expectDataQualityRuleBaseCustomRegexAddContract(
      page,
      "SR-2099-01-DQ-RULEBASE-REGEX-ADD-L7651",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7670
// intent: SR-2099-01-DQ-RULEBASE-REGEX-EDIT-001
// probe: SR-UI-PROBE-20260527-DQ-RULEBASE-REGEX-EDIT-001
test("【P1】数据质量规则库自定义正则编辑、详情与未引用删除可核验", async ({ page, step }) => {
  await step("步骤1: 进入自定义正则页 → 编辑待删除规则、查看详情回显并删除未引用规则", async () => {
    await expectDataQualityRuleBaseCustomRegexEditDetailDeleteContract(
      page,
      "SR-2099-01-DQ-RULEBASE-REGEX-EDIT-L7670",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7670
// intent: SR-2099-01-DQ-RULEBASE-REGEX-DELETE-PROTECTION-001
// probe: SR-UI-PROBE-20260527-DQ-RULEBASE-REGEX-REFERENCED-001
test("【P1】数据质量规则库已引用自定义正则删除保护可核验", async ({ page, step }) => {
  test.fail(
    true,
    "ltqc-local 当前规则集旧包残留已删除 ruleLibraryId，规则任务保存返回 Library not found；保留 expected-fail 暴露已引用自定义正则删除保护前置限制",
  );
  await step("步骤1: 进入自定义正则页 → 尝试删除已被规则引用的自定义正则并验证保护", async () => {
    await expectDataQualityRuleBaseReferencedCustomRegexDeleteProtectionContract(
      page,
      "SR-2099-01-DQ-RULEBASE-REGEX-DELETE-PROTECTION-L7670",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7690
// intent: SR-2099-01-DQ-RULEBASE-SQL-BASIC-001
// probe: SR-UI-PROBE-20260527-DQ-RULEBASE-SQL-BASIC-001
test("【P0】数据质量规则库自定义 SQL 模版基础信息保存与详情可核验", async ({ page, step }) => {
  test.fail(true, "ltqc-local 仅填写基础信息提交返回「自定义配置不能为空」，保留断言暴露 Archive 预期差异");
  await step("步骤1: 进入新增自定义 SQL 模板页 → 填写基础信息并保存，验证列表和详情回显", async () => {
    await expectDataQualityRuleBaseCustomSqlBasicInfoSaveContract(
      page,
      "SR-2099-01-DQ-RULEBASE-SQL-BASIC-L7690",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7709
// intent: SR-2099-01-DQ-RULEBASE-SQL-PARAMS-001
// probe: results/20260527-dq-rulebase-sql-probe/playwright/ui-probe/sql-add-form.png
test("【P0】数据质量规则库自定义 SQL 模版参数解析与类型选择可核验", async ({ page, step }) => {
  await step("步骤1: 进入新增自定义 SQL 模板页 → 输入 SQL 后参数列表自动解析并展示类型选项", async () => {
    await expectDataQualityRuleBaseCustomSqlParamConfigContract(
      page,
      "SR-2099-01-DQ-RULEBASE-SQL-PARAMS-L7709",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7728
// intent: SR-2099-01-DQ-RULEBASE-SQL-DETAIL-001
// probe: results/20260527-dq-rulebase-sql-detail-probe/playwright/ui-probe/sql-list-final.png
test("【P0】数据质量规则库自定义 SQL 模版详情编辑与引用保护可核验", async ({ page, step }) => {
  await step("步骤1: 进入自定义 SQL 模板列表 → 打开已引用模板编辑页、保存描述并验证删除保护", async () => {
    await expectDataQualityRuleBaseCustomSqlDetailEditProtectionContract(
      page,
      "SR-2099-01-DQ-RULEBASE-SQL-DETAIL-L7728",
    );
  });
});

// archive-title: 验证【数据质量-菜单名称】历史项目菜单名称正确修改
test("【P0】数据质量历史项目菜单名称与新路由可核验", async ({ page }) => {
  await expectDataQualityMenuRenameContract(page, "SR-2099-01-DQ-MENU-L8382");
});
