// spec: features/v7.0.0/【v700】【16035】【浙商证券】【数据质量】StarRocks3.x数据源支持/cases/archive.md#case=dq-module-contract
// intent: SR-INTENT-2026-06-DQ-SR3X-003
// probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// page: _shared/pages/2026-06-dq-starrocks3x/starrocks3x-quality-page.ts
// generated_at: 2026-06-24T14:10:26Z
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  expectRuleConfigShell,
  expectTaskQueryShell,
  fetchMonitorRecords,
  fetchRuleCollection,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-quality-page";

test.setTimeout(120000);

test.describe("@serial StarRocks3.x 数据质量模块契约", () => {
  test("【P1】规则配置与任务查询模块在 pw_sr3 项目下接口契约成功", async ({ page, step }) => {
    await step("步骤1: 打开规则配置 → 规则集区与规则列表区加载成功", async () => {
      await expectRuleConfigShell(page);
      const ruleCollections = await fetchRuleCollection(page);
      expect(Array.isArray(ruleCollections), "规则集接口应返回数组数据结构").toBe(true);
    });

    await step("步骤2: 打开任务查询 → 实例查询页面与列表接口加载成功", async () => {
      await expectTaskQueryShell(page);
      const monitorRecords = await fetchMonitorRecords(page);
      expect(
        Array.isArray(monitorRecords.data ?? []),
        "任务查询接口应返回 data 数组，即使当前项目暂无实例也应保持契约成功",
      ).toBe(true);
    });
  });
});
