// spec: features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md#assets
// intent: SR-INTENT-LT-DQ-LAUNCHED-REQS-ASSETS
// probe: SR-UI-PROBE-20260522-LR-ASSETS-001
// page: _shared/pages/2099-01-lt-dq-launched-reqs/assets/launched-assets-page.ts
// generated_at: 2026-05-22T12:20:00.000Z
// inventory: results/inventory.json area=assets
// probe_evidence: results/260522-lr-assets-probe-01/playwright/ui-probe/probe.json
// interaction_probe_evidence: results/260522-lr-assets-probe-01/playwright/ui-probe/interaction-probe.json
// META: {"area":"assets","case_count":8,"title":"资产盘点 area launched requirements bounded UI automation"}
// SourceRefs: SR-INTENT-LT-DQ-LAUNCHED-REQS-ASSETS, SR-UI-PROBE-20260522-LR-ASSETS-001, src.case.archive.0023@1, src.case.archive.0024@1, src.case.archive.0157@1, src.case.archive.0158@1, src.case.archive.0159@1, src.case.archive.0160@1, src.case.archive.0161@1, src.case.archive.0162@1, src.ui.lr-assets.interaction.data-map-field-click@1, src.ui.lr-assets.interaction.metadata-sync-edit-schedule@1, src.ui.lr-assets.interaction.standard-check-new@1
import { test } from "../../../../_shared/fixtures/step-screenshot";
import { LaunchedAssetsPage } from "../../../../_shared/pages/2099-01-lt-dq-launched-reqs/assets/launched-assets-page";
import { getEnvConfig } from "../../../../_shared/runtime/env-profile";
import { ASSETS_SCOPE, ASSETS_SOURCE_REFS } from "../data/assets/assets-launched-cases";

test.use({ storageState: getEnvConfig().auth.sessionPath });
test.setTimeout(120_000);

test("LR-0023 字段结果页目录联动入口和当前字段列表可核验", async ({ page, step }) => {
  const assets = new LaunchedAssetsPage(page);

  await step("步骤1: 进入数据地图并打开字段结果页", async () => {
    await assets.gotoDataMap(ASSETS_SOURCE_REFS.lr0023);
    await assets.openFieldResults(ASSETS_SOURCE_REFS.dataMapProbe);
  });

  await step("步骤2: 查看字段结果页目录筛选 Shell", async () => {
    await assets.expectFieldResultCatalogShell(ASSETS_SOURCE_REFS.lr0023);
  });

  await step("步骤3: 查看当前字段结果列表", async () => {
    await assets.expectCurrentFieldRows(ASSETS_SOURCE_REFS.lr0023, ASSETS_SCOPE.fieldResultCountText);
  });
});

test("LR-0024 字段结果页支持进入组合查询结果页面", async ({ page, step }) => {
  const assets = new LaunchedAssetsPage(page);

  await step("步骤1: 进入数据地图并切换字段类型", async () => {
    await assets.gotoDataMap(ASSETS_SOURCE_REFS.lr0024);
    await assets.openFieldResults(ASSETS_SOURCE_REFS.dataMapProbe);
  });

  await step("步骤2: 字段结果页展示模糊匹配和数据目录控件", async () => {
    await assets.expectFieldResultCatalogShell(ASSETS_SOURCE_REFS.lr0024);
    await assets.expectCurrentFieldRows(ASSETS_SOURCE_REFS.lr0024, ASSETS_SCOPE.fieldResultCountText);
  });
});

test("LR-0157 编辑元数据同步任务展示环境参数配置入口", async ({ page, step }) => {
  const assets = new LaunchedAssetsPage(page);

  await step("步骤1: 进入元数据同步列表", async () => {
    await assets.gotoMetadataSync(ASSETS_SOURCE_REFS.lr0157);
  });

  await step("步骤2: 编辑 SparkThrift 周期同步任务并进入调度配置", async () => {
    await assets.openFirstSparkMetadataSyncEditSchedule(
      ASSETS_SOURCE_REFS.metadataSyncProbe,
      ASSETS_SCOPE.sparkDataSourceName,
    );
  });

  await step("步骤3: 调度配置展示环境参数配置按钮", async () => {
    await assets.expectMetadataEnvironmentConfigButton(ASSETS_SOURCE_REFS.lr0157);
  });
});

test("LR-0159 元数据同步任务环境参数配置弹窗可打开", async ({ page, step }) => {
  const assets = new LaunchedAssetsPage(page);

  await step("步骤1: 进入元数据同步编辑调度配置", async () => {
    await assets.gotoMetadataSync(ASSETS_SOURCE_REFS.lr0159);
    await assets.openFirstSparkMetadataSyncEditSchedule(
      ASSETS_SOURCE_REFS.metadataSyncProbe,
      ASSETS_SCOPE.sparkDataSourceName,
    );
  });

  await step("步骤2: 点击环境参数配置并校验弹窗", async () => {
    await assets.openMetadataEnvironmentConfigDialog(ASSETS_SOURCE_REFS.lr0159);
  });
});

test("LR-0161 SparkThrift 元数据同步限制场景入口可核验", async ({ page, step }) => {
  const assets = new LaunchedAssetsPage(page);

  await step("步骤1: 进入元数据同步列表", async () => {
    await assets.gotoMetadataSync(ASSETS_SOURCE_REFS.lr0161);
  });

  await step("步骤2: 编辑 SparkThrift 同步任务时展示环境参数配置", async () => {
    await assets.openFirstSparkMetadataSyncEditSchedule(
      ASSETS_SOURCE_REFS.metadataSyncProbe,
      ASSETS_SCOPE.sparkDataSourceName,
    );
    await assets.expectMetadataEnvironmentConfigButton(ASSETS_SOURCE_REFS.lr0161);
  });
});

test("LR-0158 落标检查任务页面入口可核验", async ({ page, step }) => {
  const assets = new LaunchedAssetsPage(page);

  await step("步骤1: 进入落标检查页面", async () => {
    await assets.gotoStandardCheck(ASSETS_SOURCE_REFS.lr0158);
  });

  await step("步骤2: 打开新增检查任务页面", async () => {
    await assets.openNewStandardCheckTask(ASSETS_SOURCE_REFS.standardCheckProbe);
    await assets.expectStandardCheckSparkEntry(ASSETS_SOURCE_REFS.lr0158);
  });
});

test("LR-0160 新建落标检查任务检查内容配置入口可核验", async ({ page, step }) => {
  const assets = new LaunchedAssetsPage(page);

  await step("步骤1: 进入落标检查新增任务", async () => {
    await assets.gotoStandardCheck(ASSETS_SOURCE_REFS.lr0160);
    await assets.openNewStandardCheckTask(ASSETS_SOURCE_REFS.standardCheckProbe);
  });

  await step("步骤2: 检查内容页面展示数据源、数据库、数据表和下一步", async () => {
    await assets.expectStandardCheckSparkEntry(ASSETS_SOURCE_REFS.lr0160);
  });
});

test("LR-0162 落标检查任务 Spark 数据源限制入口可核验", async ({ page, step }) => {
  const assets = new LaunchedAssetsPage(page);

  await step("步骤1: 进入落标检查新增任务", async () => {
    await assets.gotoStandardCheck(ASSETS_SOURCE_REFS.lr0162);
    await assets.openNewStandardCheckTask(ASSETS_SOURCE_REFS.standardCheckProbe);
  });

  await step("步骤2: 检查数据范围表单展示待选数据源", async () => {
    await assets.expectStandardCheckSparkEntry(ASSETS_SOURCE_REFS.lr0162);
  });
});
