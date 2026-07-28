// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1329",
  "title": "验证【数据标准标准下线逻辑调整】「数据标准」-「标准定义」标准进行\"下线\"操作时页面测试",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "找到【test】标准（该标准已上线且被落标检查任务使用），确认该标准的操作栏",
      "expected": "该标准操作栏只有\"下线\"按钮"
    },
    {
      "action": "点击【下线】按钮",
      "expected": "弹出提示框\"该数据标准已被引用至0张数据表，下线数据标准数据表中将不再展示字段的标准标签信息，且会同步删除标准映射结果\""
    },
    {
      "action": "点击提示框【下线】按钮",
      "expected": "弹出提示框\"已有关联标准的字段xxx_xxx、xxx_xxx（表名_字段名）等xx个字段创建了落标检查任务，请先前往落标检查任务关闭字段的检查后再进行标准下线。\""
    }
  ]
} as const;

test.describe("验证【数据标准标准下线逻辑调整】「数据标准」-「标准定义」标准进行\"下线\"操作时页面测试", () => {
  test("C1329 验证【数据标准标准下线逻辑调整】「数据标准」-「标准定义」标准进行\"下线\"操作时页面测试", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
