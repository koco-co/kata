// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C002",
  "title": "验证【数据表】表数量统计正确",
  "steps": [
    {
      "action": "1. 新增元数据同步-周期同步任务\n2. 选择 Doris 数据源，选择对应 database\n3. 选择数据表 test_table\n4. 勾选【全部内容】\n5. 点击【临时同步】按钮",
      "expected": "元数据同步任务创建成功，任务状态显示\"运行中\"，实例状态显示\"运行中\""
    },
    {
      "action": "等待任务运行完成，实例状态变为\"运行成功\"",
      "expected": "数据地图首页【数据表】统计数量显示 N+1，页面数字与同步前相差恰好为 1"
    },
    {
      "action": "在数据地图中找到 test_table，点击【删除元表】并确认",
      "expected": "【数据表】统计数量恢复为 N，页面数字与删除前相差恰好为 1"
    }
  ]
} as const;

test.describe("验证【数据表】表数量统计正确", () => {
  test("C002 验证【数据表】表数量统计正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
