// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1207",
  "title": "验证 「元数据」中 Doris 3.x 元数据临时同步功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【元数据】-【元数据同步】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新增周期同步任务」",
      "expected": "弹出「新增周期同步任务」弹窗"
    },
    {
      "action": "「数据源」: ${建表所在的Doris 3.x数据源}「数据库」: ${建表所在的Doris 3.x数据库}「数据表」: vehicle_info_part1 ~3",
      "expected": "配置成功"
    },
    {
      "action": "点击「临时同步」按钮",
      "expected": "1) 「新增周期同步任务」弹窗关闭, 并Toast提示: 临时同步成功2) 同步状态为同步中, 等待一段时间后, 同步状态变更为同步完成"
    },
    {
      "action": "进入数据地图页面, 查询关键词vehicle_info_part",
      "expected": "显示已同步的Doris 3.x的三张表"
    }
  ]
} as const;

test.describe("验证 「元数据」中 Doris 3.x 元数据临时同步功能正常", () => {
  test("C1207 验证 「元数据」中 Doris 3.x 元数据临时同步功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
