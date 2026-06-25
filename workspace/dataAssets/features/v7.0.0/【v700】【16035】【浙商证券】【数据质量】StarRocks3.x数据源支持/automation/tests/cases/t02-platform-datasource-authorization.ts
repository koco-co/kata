// spec: features/v7.0.0/【v700】【16035】【浙商证券】【数据质量】StarRocks3.x数据源支持/cases/archive.md#case=platform-datasource-management
// intent: SR-INTENT-2026-06-DQ-SR3X-002
// probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// page: _shared/pages/2026-06-dq-starrocks3x/starrocks3x-quality-page.ts
// generated_at: 2026-06-24T14:10:26Z
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  expectPlatformDataSourceShell,
  expectStarRocksMonitorSource,
  fetchDataSourceTypeOptions,
  fetchStarRocksMonitorSources,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-quality-page";
import { STARROCKS3X_CONTRACT } from "../data/starrocks3x-contract";

test.setTimeout(120000);

test.describe("@serial StarRocks3.x 平台数据源授权", () => {
  test("【P0】平台管理数据源授权结果对数据质量可见", async ({ page, step }) => {
    await step("步骤1: 进入平台管理-数据源管理 → 引入数据源与质量项目授权入口可见", async () => {
      await expectPlatformDataSourceShell(page);
    });

    await step("步骤2: 读取数据质量监控数据源 → pw_sr3 授权到当前质量项目", async () => {
      const records = await fetchStarRocksMonitorSources(page);
      const record = expectStarRocksMonitorSource(records, {
        dataSourceName: STARROCKS3X_CONTRACT.datasource.name,
        sourceTypeValue: STARROCKS3X_CONTRACT.datasource.sourceTypeValue,
        dataSourceType: STARROCKS3X_CONTRACT.datasource.sourceTypeId,
        assetsId: STARROCKS3X_CONTRACT.datasource.assetsId,
        centerSourceId: STARROCKS3X_CONTRACT.datasource.centerSourceId,
      });
      expect(String(record.projectId), "授权项目 ID 应为 pw_sr3 质量项目").toBe(
        String(STARROCKS3X_CONTRACT.project.id),
      );
    });

    await step("步骤3: 读取数据源类型枚举 → STAR_ROCKS_3.x 类型编码 118 已在数据质量可用", async () => {
      const types = await fetchDataSourceTypeOptions(page);
      expect(types, "数据质量数据源类型枚举应包含 STAR_ROCKS_3.x").toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            value: STARROCKS3X_CONTRACT.datasource.sourceTypeId,
            text: STARROCKS3X_CONTRACT.datasource.sourceTypeLabel,
          }),
        ]),
      );
    });
  });
});
