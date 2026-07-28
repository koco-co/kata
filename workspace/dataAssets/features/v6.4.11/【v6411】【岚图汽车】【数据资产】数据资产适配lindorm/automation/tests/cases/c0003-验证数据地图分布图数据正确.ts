// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L163,#L178,#L196
// intent: SR-INTENT-2099-01-MD-001
// probe: SR-UI-PROBE-20260522-METADATA-001
// page: _shared/pages/2099-01-lt-dq-main-flow/metadata-search-page.ts
// generated_at: 2026-05-22T03:12:41Z
// META: {"id":"MD-001","priority":"P3/P2","title":"数据地图首页和搜索类型下拉可核验"}
// SourceRefs: SR-2099-01-MD-LANDING-L163, SR-2099-01-MD-SEARCH-DROPDOWN-L178, SR-2099-01-MD-DATATABLE-SEARCH-L196, SR-2099-01-MD-001, SR-UI-PROBE-20260522-METADATA-001, SR-SELF-RUN-METADATA-001
import { test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  expectEmptySearch,
  expectDataMapLandingContract,
  expectDataMapSearchTypeOptions,
  expectSearchResult,
} from "../../../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-search-page";
import { METADATA_SCOPE, SR_2099_01_MD_001 } from "../fixtures/metadata-contract";

test.setTimeout(90000);

test("【P3/P2】元数据数据地图首页与搜索类型下拉可核验", async ({ page, step }) => {
  await step("步骤1: 进入数据地图首页 → 首页核心模块可见", async () => {
    await expectDataMapLandingContract(page, SR_2099_01_MD_001);
  });

  await step("步骤2: 展开搜索类型下拉 → 资产类型选项与真实 UI 一致", async () => {
    await expectDataMapSearchTypeOptions(page, SR_2099_01_MD_001);
  });
});

test("【P1】元数据数据地图数据表类型搜索结果可核验", async ({ page, step }) => {
  await step("步骤1-11: 数据表关键词精准、模糊、大小写、中文、库名、数据源名与特殊字符搜索", async () => {
    await expectSearchResult(page, METADATA_SCOPE.searchTable, [METADATA_SCOPE.searchTable], "SR-2099-01-MD-DATATABLE-SEARCH-L196");
    await expectSearchResult(page, "test_", [METADATA_SCOPE.searchTable], "SR-2099-01-MD-DATATABLE-SEARCH-L196");
    await expectSearchResult(page, METADATA_SCOPE.searchTable.toUpperCase(), [METADATA_SCOPE.searchTable], "SR-2099-01-MD-DATATABLE-SEARCH-L196");
    await expectSearchResult(page, METADATA_SCOPE.searchChinese, [METADATA_SCOPE.searchChinese], "SR-2099-01-MD-DATATABLE-SEARCH-L196");
    await expectSearchResult(page, METADATA_SCOPE.searchDatabase, [METADATA_SCOPE.searchDatabase], "SR-2099-01-MD-DATATABLE-SEARCH-L196");
    await expectSearchResult(page, METADATA_SCOPE.searchDatasource, [METADATA_SCOPE.searchDatasource], "SR-2099-01-MD-DATATABLE-SEARCH-L196");
    await expectEmptySearch(page, "!@#$%^&*", "SR-2099-01-MD-DATATABLE-SEARCH-L196");
  });
});
