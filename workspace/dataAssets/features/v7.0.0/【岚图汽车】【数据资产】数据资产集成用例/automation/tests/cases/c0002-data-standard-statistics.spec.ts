// case: C0002 验证「数据标准」标准统计各维度结果展示
// intent: SR-INTENT-20260702-DATA-STANDARD-INTEGRATION
// probe: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC
// generated_at: 2026-07-02T02:57:40Z
import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  DataStandardIntegrationPage,
  type CreatedPlatformRecord,
  type SourceCaseBlocker,
  type SourceCasePreconditionReport,
} from "../pages/data-standard-page";

test.describe("@serial 【P1】「数据标准」模块集成测试用例 - live UI + 业务记录", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(1_200_000);

  let sourceCasePreconditions: SourceCasePreconditionReport | null = null;
  const sourceCaseBlockers: SourceCaseBlocker[] = [];

  async function ensureSourceCasePreconditions(
    standard: DataStandardIntegrationPage,
  ): Promise<SourceCasePreconditionReport> {
    if (!sourceCasePreconditions) {
      sourceCasePreconditions = await standard.prepareSourceCasePreconditions(
        "SR-UI-PROBE-20260702-DATA-STANDARD-LTQC",
      );
      sourceCaseBlockers.push(...sourceCasePreconditions.blockers);
    }
    return sourceCasePreconditions;
  }

  test("标准统计页展示统计卡片、图表区和核心接口", async ({ page, step }) => {
    const standard = new DataStandardIntegrationPage(page);
    await step("步骤1-7: 进入标准统计并查看统计结果 → 统计卡片、趋势/分布图表区与接口均可用", async () => {
      await standard.expectStandardStatistic("SR-UI-PROBE-20260702-DATA-STANDARD-LTQC");
    });
  });

  test("源用例前置条件、词根管理和码表管理固定数据", async ({ page, step }) => {
    const standard = new DataStandardIntegrationPage(page);
    const platformRecords: CreatedPlatformRecord[] = [];

    await step("前置条件1-4: 校验/准备 test 词根、测试/test1 码表、年龄/age 标准，并探测 SparkThrift2.x 精确表", async () => {
      const report = await ensureSourceCasePreconditions(standard);
      platformRecords.push(...report.records);
      await test.info().attach("source-case-preconditions", {
        body: JSON.stringify(report, null, 2),
        contentType: "application/json",
      });
    });
    await step("步骤8-14: 进入词根管理 → 词根列表、导入/新建/导出入口和表头可见", async () => {
      await standard.expectRootManagement("SR-UI-PROBE-20260702-DATA-STANDARD-LTQC");
    });
    await step("步骤9、16-17: 按源用例固定值创建 email 词根和 code/001 码表 → 平台列表产生固定记录", async () => {
      platformRecords.push(...(await standard.createSourceCaseBasisRecords("SR-UI-PROBE-20260702-DATA-STANDARD-LTQC")));
    });
    await step("步骤15-23: 进入码表管理 → 码表列表、导入/新建/导出入口和表头可见", async () => {
      await standard.expectCodeTableManagement("SR-UI-PROBE-20260702-DATA-STANDARD-LTQC");
    });
    await step("步骤144-146: 进入行业模版 → live 文案为「行业模版」，引用标准入口和表头可见", async () => {
      await standard.expectIndustryTemplate("SR-UI-PROBE-20260702-DATA-STANDARD-LTQC");
    });
    await step("步骤147-153: 进入数据库拾取 → 新建拾取入口和拾取列表表头可见", async () => {
      await standard.expectDatabaseCollect("SR-UI-PROBE-20260702-DATA-STANDARD-LTQC");
    });
    await step("步骤147-153: 新建词根/数据标准数据库拾取并等待完成 → 拾取列表产生完成记录", async () => {
      platformRecords.push(
        ...(await standard.createDatabaseCollectionRecords("SR-UI-PROBE-20260702-DATA-STANDARD-LTQC")),
      );
    });

    await test.info().attach("platform-records-standard-basis", {
      body: JSON.stringify(platformRecords, null, 2),
      contentType: "application/json",
    });
  });

  test("标准管理页创建标准定义并发起标准映射", async ({ page, step }) => {
    const standard = new DataStandardIntegrationPage(page);
    const platformRecords: CreatedPlatformRecord[] = [];

    await step("步骤24-60、154-158: 进入标准定义 → 新建/导入/导出入口、标准目录和列表表头可见", async () => {
      await standard.expectStandardDefinition("SR-UI-PROBE-20260702-DATA-STANDARD-LTQC");
    });
    await step("步骤61-73: 进入标准映射 → 标准映射入口和字段绑定列表表头可见", async () => {
      await standard.expectStandardMapping("SR-UI-PROBE-20260702-DATA-STANDARD-LTQC");
    });
    await step("步骤28-49、62、68-71: 按源用例固定值创建 金额/邮箱/总额 标准并发起 SparkThrift2.x 映射", async () => {
      await ensureSourceCasePreconditions(standard);
      const result = await standard.createSourceCaseStandardsAndMappings("SR-UI-PROBE-20260702-DATA-STANDARD-LTQC");
      platformRecords.push(...result.records);
      sourceCaseBlockers.push(...result.blockers);
    });

    await test.info().attach("platform-records-standard-management", {
      body: JSON.stringify(platformRecords, null, 2),
      contentType: "application/json",
    });
  });

  test("落标检查页覆盖总览、设置/结果列表和新增检查任务入口", async ({ page, step }) => {
    const standard = new DataStandardIntegrationPage(page);
    const platformRecords: CreatedPlatformRecord[] = [];
    await step("步骤74-86、137-143: 进入落标检查 → 总览指标、设置/结果列表和批量按钮可见", async () => {
      await standard.expectStandardCheck("SR-UI-PROBE-20260702-DATA-STANDARD-LTQC");
    });
    await step("步骤75、87、98、117: 点击新增检查任务 → 新增检查任务配置入口可打开", async () => {
      await standard.expectStandardCheckAddEntry("SR-UI-PROBE-20260702-DATA-STANDARD-LTQC");
    });
    await step("步骤75-136: 按源用例创建并执行落标检查任务 → 平台产生检查设置/结果记录", async () => {
      await ensureSourceCasePreconditions(standard);
      const result = await standard.createSourceCaseStandardCheckRecords("SR-UI-PROBE-20260702-DATA-STANDARD-LTQC");
      platformRecords.push(...result.records);
      sourceCaseBlockers.push(...result.blockers);
      await test.info().attach("platform-records-standard-check", {
        body: JSON.stringify(platformRecords, null, 2),
        contentType: "application/json",
      });
    });
    await step("步骤10/18/37/50/53-60/99/118/141-143: 输出源用例剩余阻塞/文本冲突证据", async () => {
      await test.info().attach("source-case-blockers", {
        body: JSON.stringify(sourceCaseBlockers, null, 2),
        contentType: "application/json",
      });
    });
  });
});
