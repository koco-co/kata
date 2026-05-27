// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7671-L7861
// intent: SR-INTENT-2099-01-DQ-RULESET-CONFIG-001
// probe: results/20260523-1930-mf-quality-ruleset-config-01/playwright/ui-probe/probe.json
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-23T11:40:49Z
// SourceRefs: SR-2099-01-DQ-RULESET-CONFIG-001, SR-UI-PROBE-20260523-DQ-RULESET-CONFIG-001
// SourceRefs: SR-SELF-RUN-20260523-DQ-RULESET-CONFIG-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataQualityRuleSetCreateBasicInfoContract,
  expectDataQualityRuleSetConfigShell,
  expectDataQualityRuleSetGlobalParamsContract,
  expectDataQualityRuleSetDeleteContract,
  expectDataQualityRuleSetDeleteHistoricalTaskIsolationContract,
  expectDataQualityRuleSetEditHistoricalTaskIsolationContract,
  expectDataQualityRuleSetListSearchEditContract,
  expectDataQualityRuleSetPackageNameManagementContract,
  expectDataQualityRuleSetRuleCrudContract,
  expectDataQualityRuleSetTableFilteringContract,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0】数据质量规则集配置-取值范围枚举与key范围配置壳可核验", async ({ page, step }) => {
  await step("步骤1: 打开规则集编辑壳 → 核验取值范围&枚举范围与key范围校验配置控件，不保存", async () => {
    await expectDataQualityRuleSetConfigShell(page, "SR-2099-01-DQ-RULESET-CONFIG-001");
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7924
// intent: SR-2099-01-DQ-RULESET-LIST-001
// probe: SR-UI-PROBE-20260526-DQ-RULESET-LIST-001
test("【P0】数据质量规则集管理列表搜索、编辑查看与规则数量可核验", async ({ page, step }) => {
  await step("步骤1: 进入规则集管理 → 搜索目标规则集、核验数量并进入编辑页查看规则包与规则", async () => {
    await expectDataQualityRuleSetListSearchEditContract(page, "SR-2099-01-DQ-RULESET-LIST-001");
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7944
// SourceRefs: SR-2099-01-DQ-RULESET-CREATE-BASIC-L7944, SR-UI-PROBE-20260527-DQ-RULESET-CREATE-BASIC-L7944-001
test("【P0】数据质量规则集管理新建规则集基础信息配置可核验", async ({ page, step }) => {
  await step("步骤1: 进入新建规则集 → 填写 SparkThrift2.x/pw_test/dwd_voyah_dq_vehicle_null_cnt 与规则包名称，下一步进入监控规则配置", async () => {
    await expectDataQualityRuleSetCreateBasicInfoContract(
      page,
      "SR-2099-01-DQ-RULESET-CREATE-BASIC-L7944",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7963
// SourceRefs: SR-2099-01-DQ-RULESET-TABLE-FILTER-L7963, SR-UI-PROBE-20260527-DQ-RULESET-TABLE-FILTER-L7963-001
test("【P0】数据质量规则集管理选择数据表过滤已配置规则集数据表可核验", async ({ page, step }) => {
  await step("步骤1: 新建规则集选择 SparkThrift2.x/pw_test 后，已配置表不可选且未配置表可选", async () => {
    await expectDataQualityRuleSetTableFilteringContract(
      page,
      "SR-2099-01-DQ-RULESET-TABLE-FILTER-L7963",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7982
// SourceRefs: SR-2099-01-DQ-RULESET-PACKAGE-MANAGE-L7982, SR-UI-PROBE-20260527-DQ-RULESET-PACKAGE-MANAGE-L7982-001
test("【P0】数据质量规则集管理规则包新增重命名删除与名称重复校验可核验", async ({ page, step }) => {
  await step("步骤1: 新建规则集基础信息页操作规则包名称 → 新增、重命名、删除空规则包、重复名称校验", async () => {
    await expectDataQualityRuleSetPackageNameManagementContract(
      page,
      "SR-2099-01-DQ-RULESET-PACKAGE-MANAGE-L7982",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8001
// SourceRefs: SR-2099-01-DQ-RULESET-RULE-CRUD-L8001, SR-UI-PROBE-20260527-DQ-RULESET-RULE-CRUD-L8001-001
test("【P0】数据质量规则集管理规则包下新增编辑删除校验规则可核验", async ({ page, step }) => {
  await step("步骤1: 进入规则集监控规则配置页 → 新增完整性校验规则，编辑统计函数/强弱规则/描述，再删除该规则", async () => {
    await expectDataQualityRuleSetRuleCrudContract(
      page,
      "SR-2099-01-DQ-RULESET-RULE-CRUD-L8001",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8020
// intent: SR-2099-01-DQ-RULESET-GLOBAL-PARAMS-001
// probe: SR-UI-PROBE-20260526-DQ-RULESET-GLOBAL-PARAMS-001
test("【P1】数据质量规则集管理查看全局参数可核验", async ({ page, step }) => {
  await step("步骤1: 进入规则集监控规则配置页 → 打开全局参数并核验参数列表后关闭", async () => {
    await expectDataQualityRuleSetGlobalParamsContract(page, "SR-2099-01-DQ-RULESET-GLOBAL-PARAMS-001");
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8039
// SourceRefs: SR-2099-01-DQ-RULESET-HISTORY-EDIT-L8039, SR-UI-PROBE-20260527-DQ-RULESET-HISTORY-EDIT-L8039-001
test("【P0】数据质量规则集管理编辑规则集后已配置历史任务不生效可核验", async ({ page, step }) => {
  test.fail(
    true,
    "ltqc-local 当前 /dq/ruleSet 前端入口不可用，且 L8039 需长链路创建/执行历史规则任务；保留 expected-fail 暴露未完成的历史任务隔离验证",
  );
  await step("步骤1: 校验 Archive 前置规则集与已引用历史规则任务，再等待环境恢复后补齐编辑规则集和重跑任务断言", async () => {
    await expectDataQualityRuleSetEditHistoricalTaskIsolationContract(
      page,
      "SR-2099-01-DQ-RULESET-HISTORY-EDIT-L8039",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8058
// SourceRefs: SR-2099-01-DQ-RULESET-HISTORY-DELETE-L8058, SR-UI-PROBE-20260527-DQ-RULESET-HISTORY-DELETE-L8058-001
test("【P0】数据质量规则集管理删除规则集后已配置历史任务不生效可核验", async ({ page, step }) => {
  test.fail(
    true,
    "ltqc-local 当前 /dq/ruleSet 前端入口不可用，且 L8058 需长链路创建/执行历史规则任务；保留 expected-fail 暴露未完成的历史任务隔离验证",
  );
  await step("步骤1: 校验 Archive 前置规则集与已引用历史规则任务，再等待环境恢复后补齐删除规则集和重跑任务断言", async () => {
    await expectDataQualityRuleSetDeleteHistoricalTaskIsolationContract(
      page,
      "SR-2099-01-DQ-RULESET-HISTORY-DELETE-L8058",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8077
// SourceRefs: SR-2099-01-DQ-RULESET-DELETE-L8077, SR-UI-PROBE-20260527-DQ-RULESET-DELETE-L8077-001
test("【P0】数据质量规则集管理删除规则集功能正常可核验", async ({ page, step }) => {
  await step("步骤1-3: 进入规则集管理 → 搜索目标规则集 → 创建并删除临时规则集，确认删除后数据表可重新新建", async () => {
    await expectDataQualityRuleSetDeleteContract(
      page,
      "SR-2099-01-DQ-RULESET-DELETE-L8077",
    );
  });
});
