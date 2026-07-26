// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L2346,#L2364,#L2379,#L2394,#L2415,#L2433,#L2451,#L2466,#L2481,#L2496,#L2512,#L2526,#L2542,#L2556,#L2573,#L2588,#L2603,#L2618,#L2633,#L2647,#L2668,#L2685,#L2703,#L2718,#L2733
// intent: SR-INTENT-2099-01-MD-038
// probe: SR-UI-PROBE-20260523-MF-METADATA-001
// page: _shared/pages/2099-01-lt-dq-main-flow/metadata-sync-page.ts
// generated_at: 2026-05-27T00:00:00+08:00
// META: {"id":"MD-038","priority":"P1/P2/P3","title":"元模型管理技术属性、通用业务属性与个性业务属性 Shell 可核验"}
// SourceRefs: SR-2099-01-MD-METAMODEL-OVERVIEW-L2346, SR-2099-01-MD-METAMODEL-TECH-L2364, SR-2099-01-MD-COMMON-BIZ-QUERY-L2379, SR-2099-01-MD-COMMON-BIZ-CREATE-UI-L2394, SR-2099-01-MD-COMMON-BIZ-CREATE-LOGIC-L2415, SR-2099-01-MD-COMMON-BIZ-EDIT-UI-L2433, SR-2099-01-MD-COMMON-BIZ-EDIT-LOGIC-L2451, SR-2099-01-MD-COMMON-BIZ-DELETE-UI-L2466, SR-2099-01-MD-COMMON-BIZ-DELETE-LOGIC-L2481, SR-2099-01-MD-PERSONAL-SUBMODEL-CREATE-UI-L2496, SR-2099-01-MD-PERSONAL-SUBMODEL-CREATE-LOGIC-L2512, SR-2099-01-MD-PERSONAL-SUBMODEL-EDIT-UI-L2526, SR-2099-01-MD-PERSONAL-SUBMODEL-EDIT-LOGIC-L2542, SR-2099-01-MD-PERSONAL-SUBMODEL-APPLY-UI-L2556, SR-2099-01-MD-PERSONAL-SUBMODEL-APPLY-LOGIC-L2573, SR-2099-01-MD-PERSONAL-SUBMODEL-DELETE-UI-L2588, SR-2099-01-MD-PERSONAL-SUBMODEL-DELETE-LOGIC-L2603, SR-2099-01-MD-PERSONAL-SUBMODEL-QUERY-L2618, SR-2099-01-MD-PERSONAL-BIZ-QUERY-L2633, SR-2099-01-MD-PERSONAL-BIZ-CREATE-UI-L2647, SR-2099-01-MD-PERSONAL-BIZ-CREATE-LOGIC-L2668, SR-2099-01-MD-PERSONAL-BIZ-EDIT-UI-L2685, SR-2099-01-MD-PERSONAL-BIZ-EDIT-LOGIC-L2703, SR-2099-01-MD-PERSONAL-BIZ-DELETE-UI-L2718, SR-2099-01-MD-PERSONAL-BIZ-DELETE-LOGIC-L2733, SR-2099-01-MD-038, SR-UI-PROBE-20260523-MF-METADATA-001
import { test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  expectCommonBusinessPropertyCreateShell,
  expectCommonBusinessPropertyLifecycleShell,
  expectCommonBusinessPropertyList,
  expectMetaModelOverviewSearchAndStats,
  expectMetaModelTechnicalProperties,
  expectPersonalBusinessPropertyLifecycleShell,
  expectPersonalBusinessSubModelShell,
} from "../../../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-sync-page";

test.setTimeout(120000);

test("【P1/P2】元模型首页搜索、统计与技术属性列表可核验", async ({ page, step }) => {
  await step("步骤1: 进入元模型管理首页 → 卡片、搜索框、搜索结果和统计项可见", async () => {
    await expectMetaModelOverviewSearchAndStats(page, "SR-2099-01-MD-METAMODEL-OVERVIEW-L2346");
  });

  await step("步骤2: 进入元模型详情技术属性 → 初始化属性和视图属性字段可见", async () => {
    await expectMetaModelTechnicalProperties(page, "SR-2099-01-MD-METAMODEL-TECH-L2364");
  });
});

test("【P2/P3】通用业务属性查询、新增、编辑与删除入口可核验", async ({ page, step }) => {
  await step("步骤1: 进入通用业务属性页 → 内置业务属性列表可见", async () => {
    await expectCommonBusinessPropertyList(page, "SR-2099-01-MD-COMMON-BIZ-QUERY-L2379");
  });

  await step("步骤2: 打开新增通用业务属性 → 必填字段、属性类型和配置项可见后取消", async () => {
    await expectCommonBusinessPropertyCreateShell(
      page,
      "SR-2099-01-MD-COMMON-BIZ-CREATE-UI-L2394, SR-2099-01-MD-COMMON-BIZ-CREATE-LOGIC-L2415",
    );
  });

  await step("步骤3: 通用业务属性列表 → 编辑、删除和列表刷新相关入口可见后取消", async () => {
    await expectCommonBusinessPropertyLifecycleShell(
      page,
      "SR-2099-01-MD-COMMON-BIZ-EDIT-UI-L2433, SR-2099-01-MD-COMMON-BIZ-EDIT-LOGIC-L2451, SR-2099-01-MD-COMMON-BIZ-DELETE-UI-L2466, SR-2099-01-MD-COMMON-BIZ-DELETE-LOGIC-L2481",
    );
  });
});

test("【P2/P3】个性业务属性子模型查询、新增、编辑、应用数据库与删除入口可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 进入个性业务属性页 → 子模型列表、展开和个性属性查询入口可见", async () => {
    await expectPersonalBusinessSubModelShell(
      page,
      "SR-2099-01-MD-PERSONAL-SUBMODEL-CREATE-UI-L2496, SR-2099-01-MD-PERSONAL-SUBMODEL-CREATE-LOGIC-L2512, SR-2099-01-MD-PERSONAL-SUBMODEL-EDIT-UI-L2526, SR-2099-01-MD-PERSONAL-SUBMODEL-EDIT-LOGIC-L2542, SR-2099-01-MD-PERSONAL-SUBMODEL-APPLY-UI-L2556, SR-2099-01-MD-PERSONAL-SUBMODEL-APPLY-LOGIC-L2573, SR-2099-01-MD-PERSONAL-SUBMODEL-DELETE-UI-L2588, SR-2099-01-MD-PERSONAL-SUBMODEL-DELETE-LOGIC-L2603, SR-2099-01-MD-PERSONAL-SUBMODEL-QUERY-L2618, SR-2099-01-MD-PERSONAL-BIZ-QUERY-L2633",
    );
  });
});

test("【P2/P3】个性业务属性新增、编辑与删除入口可核验", async ({ page, step }) => {
  await step("步骤1: 个性业务属性页 → 新增、编辑、删除弹窗字段与属性类型选项可见后取消", async () => {
    await expectPersonalBusinessPropertyLifecycleShell(
      page,
      "SR-2099-01-MD-PERSONAL-BIZ-CREATE-UI-L2647, SR-2099-01-MD-PERSONAL-BIZ-CREATE-LOGIC-L2668, SR-2099-01-MD-PERSONAL-BIZ-EDIT-UI-L2685, SR-2099-01-MD-PERSONAL-BIZ-EDIT-LOGIC-L2703, SR-2099-01-MD-PERSONAL-BIZ-DELETE-UI-L2718, SR-2099-01-MD-PERSONAL-BIZ-DELETE-LOGIC-L2733",
    );
  });
});
