// spec: features/v7.0.0/【v700】【16035】【浙商证券】【数据质量】StarRocks3.x数据源支持/cases/archive.md#case=platform-datasource-auth-to-dq-rule
// intent: SR-INTENT-2026-06-DQ-SR3X-001
// probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// page: _shared/pages/2026-06-dq-starrocks3x/starrocks3x-quality-page.ts
// generated_at: 2026-06-24T14:10:26Z
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  expectDatasourceDropdownContainsStarRocks,
  expectLoadedTableOptions,
  expectRuleConfigShell,
  expectStarRocksMonitorSource,
  fetchStarRocksMonitorSources,
  openSingleTableRuleWizard,
  selectStarRocksDatasource,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-quality-page";
import { STARROCKS3X_CONTRACT } from "../data/starrocks3x-contract";

test.setTimeout(120000);

test.describe("@serial StarRocks3.x 规则配置入口", () => {
  test("【P0】StarRocks3.x 数据源在单表校验规则向导可选并加载表", async ({ page, step }) => {
    await step("步骤1: 进入数据质量-规则配置 → 规则配置页与规则表格加载成功", async () => {
      await expectRuleConfigShell(page);
    });

    await step("步骤2: 进入新建单表校验规则 → 数据源下拉包含 pw_sr3（STAR_ROCKS_3X）", async () => {
      await openSingleTableRuleWizard(page);
      const options = await expectDatasourceDropdownContainsStarRocks(
        page,
        STARROCKS3X_CONTRACT.datasource.displayText,
      );
      expect(options, "数据源下拉应只少包含已授权的 StarRocks3.x 数据源").toContain(
        STARROCKS3X_CONTRACT.datasource.displayText,
      );
    });

    await step("步骤3: 选择 pw_sr3 数据源 → 表下拉加载本需求 StarRocks 表", async () => {
      await selectStarRocksDatasource(page, STARROCKS3X_CONTRACT.datasource.displayText);
      const tables = await expectLoadedTableOptions(page, STARROCKS3X_CONTRACT.tables.dropdownEvidence);
      expect(tables.length, "StarRocks 数据表下拉应至少返回一批表选项").toBeGreaterThan(0);
    });

    await step("步骤4: 校验授权接口 → 数据源状态、类型、项目授权均正确", async () => {
      const records = await fetchStarRocksMonitorSources(page);
      expectStarRocksMonitorSource(records, {
        dataSourceName: STARROCKS3X_CONTRACT.datasource.name,
        sourceTypeValue: STARROCKS3X_CONTRACT.datasource.sourceTypeValue,
        dataSourceType: STARROCKS3X_CONTRACT.datasource.sourceTypeId,
        assetsId: STARROCKS3X_CONTRACT.datasource.assetsId,
        centerSourceId: STARROCKS3X_CONTRACT.datasource.centerSourceId,
      });
    });
  });
});
