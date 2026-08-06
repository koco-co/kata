// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L2747,#L2763,#L2777,#L2793,#L2807,#L2822,#L2840,#L2857,#L2872,#L2887,#L2902,#L2917,#L2932,#L2947,#L2961,#L2977,#L2992,#L3010,#L3027,#L3043,#L3059,#L3075,#L3089,#L3105,#L3120,#L3138
// intent: SR-INTENT-2099-01-MD-039
// probe: SR-UI-PROBE-20260523-MF-METADATA-001
// generated_at: 2026-05-27T00:00:00+08:00
// META: {"id":"MD-039","priority":"P1/P2/P3","title":"元数据管理数据源、数据库、数据表列表与导入导出 Shell 可核验"}
// SourceRefs: SR-2099-01-MD-MGMT-NAV-L2747, SR-2099-01-MD-MGMT-DATASOURCE-DISPLAY-L2763, SR-2099-01-MD-MGMT-DATASOURCE-SORT-L2777, SR-2099-01-MD-MGMT-DATASOURCE-FILTER-L2793, SR-2099-01-MD-MGMT-DATASOURCE-SEARCH-L2807, SR-2099-01-MD-MGMT-DATASOURCE-PAGING-L2822, SR-2099-01-MD-MGMT-DATASOURCE-EDIT-L2840, SR-2099-01-MD-MGMT-IMPORT-SUCCESS-L2857, SR-2099-01-MD-MGMT-IMPORT-DB-ERROR-L2872, SR-2099-01-MD-MGMT-IMPORT-NS-ERROR-L2887, SR-2099-01-MD-MGMT-IMPORT-TABLE-ERROR-L2902, SR-2099-01-MD-MGMT-IMPORT-BIZ-ERROR-L2917, SR-2099-01-MD-MGMT-IMPORT-CATALOG-ERROR-L2932, SR-2099-01-MD-MGMT-DB-DISPLAY-L2947, SR-2099-01-MD-MGMT-DB-SORT-L2961, SR-2099-01-MD-MGMT-DB-SEARCH-L2977, SR-2099-01-MD-MGMT-DB-PAGING-L2992, SR-2099-01-MD-MGMT-DB-EDIT-L3010, SR-2099-01-MD-MGMT-DB-LIFECYCLE-L3027, SR-2099-01-MD-MGMT-DB-IMPORT-L3043, SR-2099-01-MD-MGMT-DB-EXPORT-L3059, SR-2099-01-MD-MGMT-TABLE-DISPLAY-L3075, SR-2099-01-MD-MGMT-TABLE-SORT-L3089, SR-2099-01-MD-MGMT-TABLE-SEARCH-L3105, SR-2099-01-MD-MGMT-TABLE-PAGING-L3120, SR-2099-01-MD-MGMT-TABLE-EDIT-L3138, SR-2099-01-MD-039, SR-UI-PROBE-20260523-MF-METADATA-001
import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  expectMetadataManagementDatabaseListShell,
  expectMetadataManagementDatasourceListShell,
  expectMetadataManagementDatasourceNavigation,
  expectMetadataManagementImportShell,
  expectMetadataManagementTableListShell,
} from "../pages/metadata-sync-page";

test.setTimeout(120000);

test("【P3】元数据管理数据源、数据库、数据表三级跳转可核验", async ({ page, step }) => {
  await step("步骤1: 元数据管理 → 点击数据源和数据库，面包屑/列表层级切换可见", async () => {
    await expectMetadataManagementDatasourceNavigation(page, "SR-2099-01-MD-MGMT-NAV-L2747");
  });
});

test("【P2/P3】元数据管理数据源列表展示、排序、筛选、搜索、分页与编辑入口可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 数据源列表 → 列、排序字段、筛选/搜索、分页和生命周期编辑弹窗可见", async () => {
    await expectMetadataManagementDatasourceListShell(
      page,
      "SR-2099-01-MD-MGMT-DATASOURCE-DISPLAY-L2763, SR-2099-01-MD-MGMT-DATASOURCE-SORT-L2777, SR-2099-01-MD-MGMT-DATASOURCE-FILTER-L2793, SR-2099-01-MD-MGMT-DATASOURCE-SEARCH-L2807, SR-2099-01-MD-MGMT-DATASOURCE-PAGING-L2822, SR-2099-01-MD-MGMT-DATASOURCE-EDIT-L2840",
    );
  });
});

test("【P1/P2】元数据管理导入元数据成功与异常场景入口可核验", async ({ page, step }) => {
  await step("步骤1: 打开导入元数据 → 数据源、上传、模板和错误文件相关入口可见后取消", async () => {
    await expectMetadataManagementImportShell(
      page,
      "SR-2099-01-MD-MGMT-IMPORT-SUCCESS-L2857, SR-2099-01-MD-MGMT-IMPORT-DB-ERROR-L2872, SR-2099-01-MD-MGMT-IMPORT-NS-ERROR-L2887, SR-2099-01-MD-MGMT-IMPORT-TABLE-ERROR-L2902, SR-2099-01-MD-MGMT-IMPORT-BIZ-ERROR-L2917, SR-2099-01-MD-MGMT-IMPORT-CATALOG-ERROR-L2932",
    );
  });
});

test("【P2/P3】元数据管理数据库列表展示、排序、搜索、分页、编辑、导入与导出入口可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 数据库列表 → 列、排序字段、搜索、分页、生命周期、导入和导出弹窗可见", async () => {
    await expectMetadataManagementDatabaseListShell(
      page,
      "SR-2099-01-MD-MGMT-DB-DISPLAY-L2947, SR-2099-01-MD-MGMT-DB-SORT-L2961, SR-2099-01-MD-MGMT-DB-SEARCH-L2977, SR-2099-01-MD-MGMT-DB-PAGING-L2992, SR-2099-01-MD-MGMT-DB-EDIT-L3010, SR-2099-01-MD-MGMT-DB-LIFECYCLE-L3027, SR-2099-01-MD-MGMT-DB-IMPORT-L3043, SR-2099-01-MD-MGMT-DB-EXPORT-L3059",
    );
  });
});

test("【P1/P2/P3】元数据管理数据表列表展示、排序、搜索、分页与编辑入口可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 数据表列表 → 列、排序字段、搜索、分页、生命周期和业务属性编辑入口可见", async () => {
    await expectMetadataManagementTableListShell(
      page,
      "SR-2099-01-MD-MGMT-TABLE-DISPLAY-L3075, SR-2099-01-MD-MGMT-TABLE-SORT-L3089, SR-2099-01-MD-MGMT-TABLE-SEARCH-L3105, SR-2099-01-MD-MGMT-TABLE-PAGING-L3120, SR-2099-01-MD-MGMT-TABLE-EDIT-L3138",
    );
  });
});
