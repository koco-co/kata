// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0119",
  "title": "验证【元数据同步】_【过滤表】功能正常",
  "steps": [
    {
      "action": "1） 创建元数据同步任务：\n2）设置数据表过滤条件：customer.*\n3）点击【立即同步】；\n4）查看实例",
      "expected": "生成任务实例，“已同步”数量不包含customer开头的表和视图"
    },
    {
      "action": "1）等待任务实例同步成功，查看数据地图",
      "expected": "customer开头的表和视图不同步至数据地图"
    }
  ]
} as const;

test.describe("验证【元数据同步】_【过滤表】功能正常", () => {
  test("C0119 验证【元数据同步】_【过滤表】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
