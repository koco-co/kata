// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C247",
  "title": "验证数据标准-引用码表",
  "steps": [
    {
      "action": "点击“引用码表”",
      "expected": "1）弹出引用码表弹窗\n2）只显示搜索框和列表表头"
    },
    {
      "action": "输入已存在的代码名称",
      "expected": "下拉实时匹配已创建的代码"
    },
    {
      "action": "选择一个代码",
      "expected": "列表显示该代码的编码内容"
    },
    {
      "action": "点击引用",
      "expected": "1）弹窗关闭\n2）枚举范围下的列表内容展示为刚刚选中代码的编码内容\n3）列表右侧顶部标识代码名称且删除icon显示"
    }
  ]
} as const;

test.describe("验证数据标准-引用码表", () => {
  test("C247 验证数据标准-引用码表", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
