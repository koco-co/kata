// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1335",
  "title": "验证【数据标准导入标准功能调整】「导入标准」-「重复则覆盖更新」提示按钮\"？\"的内容",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击【导入标准】按钮",
      "expected": "进入[导入标准]配置页面"
    },
    {
      "action": "鼠标悬浮在【重复处理规则】-【重复则覆盖更新】后的\"？\"上",
      "expected": "显示\"\"标准英文名称\"重复则覆盖更新，若存在车型信息，会将\"英文名称+车型\"联合判断，重复则覆盖更新\""
    }
  ]
} as const;

test.describe("验证【数据标准导入标准功能调整】「导入标准」-「重复则覆盖更新」提示按钮\"？\"的内容", () => {
  test("C1335 验证【数据标准导入标准功能调整】「导入标准」-「重复则覆盖更新」提示按钮\"？\"的内容", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
