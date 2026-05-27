// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7115-L7138,L7306-L7334,L13141-L13181
// intent: SR-INTENT-2099-01-DQ-REPORT-CONFIG-001
// probe: SR-UI-PROBE-20260523-DQ-REPORT-CONFIG-001
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-23T07:40:00Z
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataQualityCustomReportCreateContract,
  expectDataQualityGeneratedReportTab,
  expectDataQualityReportDuplicateNameValidationContract,
  expectDataQualityReportEditViewDeleteContract,
  expectDataQualityReportCreateEntry,
  expectDataQualityRuleBaseCustomSqlTemplate,
  expectDataQualityRuleSetCreateEntry,
  expectDataQualityRuleTaskCreateEntry,
  expectDataQualitySingleTableReportCreateContract,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";
import { ensureDtstackPreconditionFile } from "../helpers/dtstack-preconditions";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(15 * 60 * 1000);

const DQ_CORE_PRECOND_FILE =
  "workspace/dataAssets/features/2099-01-lt-dq-main-flow/tests/precond/data-quality-core-tables.yaml";

test("【P0/P1】数据质量报告、规则任务、规则集与自定义SQL模板入口可核验", async ({ page, step }) => {
  await step("步骤1: 切换数据质量报告已生成报告页签 → 筛选项、列表字段与报告详情入口可见", async () => {
    await expectDataQualityGeneratedReportTab(page, "SR-2099-01-DQ-REPORT-CONFIG-001");
  });

  await step("步骤2: 打开新增报告入口 → 报告基础配置字段可见且未提交表单", async () => {
    await expectDataQualityReportCreateEntry(page, "SR-2099-01-DQ-REPORT-CONFIG-001");
  });

  await step("步骤3: 打开新建监控规则入口 → 监控对象基础字段可见且未提交表单", async () => {
    await expectDataQualityRuleTaskCreateEntry(page, "SR-2099-01-DQ-REPORT-CONFIG-001");
  });

  await step("步骤4: 打开新建规则集入口 → 规则集基础字段和规则包名称可见且未提交表单", async () => {
    await expectDataQualityRuleSetCreateEntry(page, "SR-2099-01-DQ-REPORT-CONFIG-001");
  });

  await step("步骤5: 打开规则库自定义SQL模板 → 列表与新增模板基础配置可见", async () => {
    await expectDataQualityRuleBaseCustomSqlTemplate(page, "SR-2099-01-DQ-REPORT-CONFIG-001");
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8637
// SourceRefs: SR-2099-01-DQ-REPORT-CONFIG-SINGLE-TABLE-L8637, SR-UI-PROBE-20260527-DQ-REPORT-CONFIG-SINGLE-TABLE-L8637-001
test("【P0】数据质量报告已配置报告新增单表报告功能正常", async ({ page, step }) => {
  await step("前置: 通过 dtstack-cli 准备数据质量报告核心表", async () => {
    ensureDtstackPreconditionFile(
      "dq-core-report-config-tables",
      DQ_CORE_PRECOND_FILE,
      "SR-2099-01-DQ-REPORT-CONFIG-SINGLE-TABLE-L8637",
    );
  });

  await step("步骤1-3: 确认无同名单表报告 → 新增 SparkThrift2.x 单表报告 → 列表回显关联表和规则范围", async () => {
    await expectDataQualitySingleTableReportCreateContract(
      page,
      "SR-2099-01-DQ-REPORT-CONFIG-SINGLE-TABLE-L8637",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8655
// SourceRefs: SR-2099-01-DQ-REPORT-CONFIG-CUSTOM-L8655, SR-UI-PROBE-20260527-DQ-REPORT-CONFIG-CUSTOM-L8655-001
test("【P0】数据质量报告已配置报告新增自定义报告功能正常", async ({ page, step }) => {
  await step("前置: 通过 dtstack-cli 准备数据质量报告核心表", async () => {
    ensureDtstackPreconditionFile(
      "dq-core-report-config-tables",
      DQ_CORE_PRECOND_FILE,
      "SR-2099-01-DQ-REPORT-CONFIG-CUSTOM-L8655",
    );
  });

  await step("步骤1-4: 确认无同名自定义报告 → 新增两张表自定义报告 → 已配置与已生成报告均可查询", async () => {
    await expectDataQualityCustomReportCreateContract(
      page,
      "SR-2099-01-DQ-REPORT-CONFIG-CUSTOM-L8655",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8674
// SourceRefs: SR-2099-01-DQ-REPORT-CONFIG-DUPLICATE-NAME-L8674, SR-UI-PROBE-20260527-DQ-REPORT-CONFIG-DUPLICATE-NAME-L8674-001
test("【P0】数据质量报告已配置报告报告名称重复校验正常", async ({ page, step }) => {
  await step("前置: 通过 dtstack-cli 准备数据质量报告核心表", async () => {
    ensureDtstackPreconditionFile(
      "dq-core-report-config-tables",
      DQ_CORE_PRECOND_FILE,
      "SR-2099-01-DQ-REPORT-CONFIG-DUPLICATE-NAME-L8674",
    );
  });

  await step("步骤1-3: 准备供应商主数据完整性日报 → 新增同名报告 → 校验重复提示且原报告不被覆盖", async () => {
    await expectDataQualityReportDuplicateNameValidationContract(
      page,
      "SR-2099-01-DQ-REPORT-CONFIG-DUPLICATE-NAME-L8674",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8692
// SourceRefs: SR-2099-01-DQ-REPORT-CONFIG-EDIT-VIEW-DELETE-L8692, SR-UI-PROBE-20260527-DQ-REPORT-CONFIG-EDIT-VIEW-DELETE-L8692-001
test("【P0】数据质量报告已配置报告编辑删除与查看报告功能正常", async ({ page, step }) => {
  await step("前置: 通过 dtstack-cli 准备数据质量报告核心表", async () => {
    ensureDtstackPreconditionFile(
      "dq-core-report-config-tables",
      DQ_CORE_PRECOND_FILE,
      "SR-2099-01-DQ-REPORT-CONFIG-EDIT-VIEW-DELETE-L8692",
    );
  });

  await step("步骤1-4: 准备车辆订单质量日报 → 编辑周期和展示方式 → 查看报告 → 删除并确认列表消失", async () => {
    await expectDataQualityReportEditViewDeleteContract(
      page,
      "SR-2099-01-DQ-REPORT-CONFIG-EDIT-VIEW-DELETE-L8692",
    );
  });
});
