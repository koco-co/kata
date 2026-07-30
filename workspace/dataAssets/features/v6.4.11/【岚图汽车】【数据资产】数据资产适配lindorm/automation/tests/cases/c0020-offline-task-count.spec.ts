// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7750,#L7769,#L7789,#L7808,#L7827,#L7846,#L7865,#L7884,#L7903
// intent: SR-INTENT-2099-01-DQ-COMMON-CONFIG-JSON-001
// probe: results/20260523-1810-mf-quality-common-config-json-01/playwright/probe/probe.json
// generated_at: 2026-05-23T10:26:00Z
// META: {"id":"DQ-020","priority":"P0","title":"通用配置 json格式校验管理列表与导入导出新增弹窗壳可核验"}
// SourceRefs: SR-2099-01-DQ-COMMON-CONFIG-JSON-001, SR-UI-PROBE-20260523-DQ-COMMON-CONFIG-JSON-001, SR-SELF-RUN-20260523-DQ-COMMON-CONFIG-JSON-001
import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { expectDataQualityReportDimensionVehicleConfigContract } from "../pages/data-quality/reports";
import { expectDataQualityCommonConfigJsonAddFullContract, expectDataQualityCommonConfigJsonAddRegexShell, expectDataQualityCommonConfigJsonEditChildDeleteContract, expectDataQualityCommonConfigJsonExportConfirmShell, expectDataQualityCommonConfigJsonExportFilteredContract, expectDataQualityCommonConfigJsonFilterPaginationContract, expectDataQualityCommonConfigJsonImportCoverContract, expectDataQualityCommonConfigJsonImportModalShell, expectDataQualityCommonConfigJsonImportSkipContract, expectDataQualityCommonConfigJsonShell } from "../pages/data-quality/settings";
import { ensureDtstackPreconditionFile } from "../fixtures/dtstack-preconditions";

test.setTimeout(15 * 60 * 1000);

const REPORT_DIMENSION_PRECOND_FILE =
  "workspace/dataAssets/features/2099-01-lt-dq-main-flow/tests/fixtures/precond/report-dimension-vehicle-info.yaml";

test("【P0】数据质量通用配置-json格式校验管理列表与弹窗壳可核验", async ({ page, step }) => {
  await step("步骤1: 进入通用配置 json格式校验管理 → 列表字段、操作入口和核心接口可见", async () => {
    await expectDataQualityCommonConfigJsonShell(page, "SR-2099-01-DQ-COMMON-CONFIG-JSON-001");
  });

  await step("步骤2: 点击导入 → 导入弹窗、重复处理规则和上传控件可见且不上传文件", async () => {
    await expectDataQualityCommonConfigJsonImportModalShell(page, "SR-2099-01-DQ-COMMON-CONFIG-JSON-001");
  });

  await step("步骤3: 点击导出 → 仅验证导出确认弹窗文案并取消，不确认下载", async () => {
    await expectDataQualityCommonConfigJsonExportConfirmShell(page, "SR-2099-01-DQ-COMMON-CONFIG-JSON-001");
  });

  await step("步骤4: 点击新增 → 新增字段、默认数据源和正则测试控件可见，不点击确定保存", async () => {
    await expectDataQualityCommonConfigJsonAddRegexShell(page, "SR-2099-01-DQ-COMMON-CONFIG-JSON-001");
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7750
// SourceRefs: SR-2099-01-DQ-GENERAL-CONFIG-DIMENSION-L7750, SR-UI-PROBE-20260527-DQ-GENERAL-CONFIG-DIMENSION-L7750-001
test("【P0】数据质量通用配置-报告关联维表设置SparkThrift车辆信息字段配置可核验", async ({ page, step }) => {
  await step("前置: 通过 dtstack-cli 准备 SparkThrift2.x/pw_test 维表 dim_voyah_vehicle_info", async () => {
    ensureDtstackPreconditionFile(
      "dq-report-dimension-vehicle-info",
      REPORT_DIMENSION_PRECOND_FILE,
      "SR-2099-01-DQ-GENERAL-CONFIG-DIMENSION-L7750",
    );
  });

  await step("步骤1: 进入报告关联维表设置 → 选择 SparkThrift2.x/pw_test 后应可选择 dim_voyah_vehicle_info", async () => {
    await expectDataQualityReportDimensionVehicleConfigContract(
      page,
      "SR-2099-01-DQ-GENERAL-CONFIG-DIMENSION-L7750",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7769
// SourceRefs: SR-2099-01-DQ-GENERAL-CONFIG-DIMENSION-L7769, SR-UI-PROBE-20260527-DQ-GENERAL-CONFIG-DIMENSION-L7769-001
test("【P0】数据质量通用配置-报告关联维表设置更新后报告车辆信息同步可核验", async ({ page, step }) => {
  await step("前置: 通过 dtstack-cli 准备 SparkThrift2.x/pw_test 维表 dim_voyah_vehicle_info", async () => {
    ensureDtstackPreconditionFile(
      "dq-report-dimension-vehicle-info",
      REPORT_DIMENSION_PRECOND_FILE,
      "SR-2099-01-DQ-GENERAL-CONFIG-DIMENSION-L7769",
    );
  });

  await step("步骤1: 进入报告关联维表设置 → 选择 SparkThrift2.x/pw_test 后应可选择 dim_voyah_vehicle_info 作为报告维表", async () => {
    await expectDataQualityReportDimensionVehicleConfigContract(
      page,
      "SR-2099-01-DQ-GENERAL-CONFIG-DIMENSION-L7769",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7789
// SourceRefs: SR-2099-01-DQ-COMMON-CONFIG-JSON-L7789, SR-UI-PROBE-20260527-DQ-COMMON-CONFIG-JSON-L7789-001
test("【P0】数据质量通用配置-json格式校验管理新增key完整流程可核验", async ({ page, step }) => {
  await step("步骤1: 新增 vehicle key → 正则匹配测试、保存、列表展示和规则集格式-json格式校验引用可核验", async () => {
    await expectDataQualityCommonConfigJsonAddFullContract(
      page,
      "SR-2099-01-DQ-COMMON-CONFIG-JSON-L7789",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7903
// intent: SR-2099-01-DQ-COMMON-CONFIG-JSON-FILTER-001
// probe: SR-UI-PROBE-20260526-DQ-COMMON-CONFIG-JSON-FILTER-001
test("【P1】数据质量通用配置-json格式校验管理搜索、数据源筛选与分页可核验", async ({ page, step }) => {
  await step("步骤1: 进入 json格式校验管理 → key 搜索、SparkThrift2.x 筛选和分页结果可核验", async () => {
    await expectDataQualityCommonConfigJsonFilterPaginationContract(
      page,
      "SR-2099-01-DQ-COMMON-CONFIG-JSON-FILTER-001",
    );
  });
});

// SourceRefs: SR-2099-01-DQ-COMMON-CONFIG-JSON-L7808, SR-2099-01-DQ-COMMON-CONFIG-JSON-L7827, SR-UI-PROBE-20260527-DQ-COMMON-CONFIG-JSON-EDIT-DELETE-001
test("【P0】数据质量通用配置-json格式校验管理编辑子层级与删除联动可核验", async ({ page, step }) => {
  await step("步骤1: 新增临时父级 key 后编辑 value格式并新增 vin 子层级，再删除父级验证子级联动移除", async () => {
    await expectDataQualityCommonConfigJsonEditChildDeleteContract(
      page,
      "SR-2099-01-DQ-COMMON-CONFIG-JSON-L7808-L7827",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7846
// SourceRefs: SR-2099-01-DQ-COMMON-CONFIG-JSON-L7846, SR-UI-PROBE-20260527-DQ-COMMON-CONFIG-JSON-L7846-001
test("【P0】数据质量通用配置-json格式校验管理导入正确文件重复则跳过可核验", async ({ page, step }) => {
  await step("步骤1: 生成并上传正确 xlsx → 重复则跳过时已有 key 不覆盖且新 key 写入列表", async () => {
    await expectDataQualityCommonConfigJsonImportSkipContract(
      page,
      "SR-2099-01-DQ-COMMON-CONFIG-JSON-L7846",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7865
// SourceRefs: SR-2099-01-DQ-COMMON-CONFIG-JSON-L7865, SR-UI-PROBE-20260527-DQ-COMMON-CONFIG-JSON-L7865-001
test("【P1】数据质量通用配置-json格式校验管理导入正确文件重复则覆盖更新可核验", async ({ page, step }) => {
  await step("步骤1: 生成并上传正确 xlsx → 重复则覆盖更新时已有 key 更新且新 key 写入列表", async () => {
    await expectDataQualityCommonConfigJsonImportCoverContract(
      page,
      "SR-2099-01-DQ-COMMON-CONFIG-JSON-L7865",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7884
// SourceRefs: SR-2099-01-DQ-COMMON-CONFIG-JSON-L7884, SR-UI-PROBE-20260527-DQ-COMMON-CONFIG-JSON-L7884-001
test("【P0】数据质量通用配置-json格式校验管理导出列表数据完整流程可核验", async ({ page, step }) => {
  await step("步骤1: 创建唯一 key 后按 key 和 SparkThrift2.x 筛选，导出 xlsx 并核对列头与导出行", async () => {
    await expectDataQualityCommonConfigJsonExportFilteredContract(
      page,
      "SR-2099-01-DQ-COMMON-CONFIG-JSON-L7884",
    );
  });
});
