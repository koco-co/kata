// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0483",
  "title": "验证数据源自动引入设置-离线开发模块编辑功能正确",
  "steps": [
    {
      "action": "1)点击【编辑】;\n2)“数据源类型”选择多个，比如：Sparkthrift和MySQL；\n3）点击【确定】",
      "expected": "1）编辑成功；\n2）自动引入设置-数据源类型更新为Sparkthrift;MySQL"
    },
    {
      "action": "1)点击【编辑】;\n2)“数据源类型”选择一个，比如：Oracle；\n3）点击【确定】",
      "expected": "1）编辑成功；\n2）自动引入设置-数据源类型更新为Oracle"
    },
    {
      "action": "1)点击【编辑】;\n2)“数据源类型”选择全部；\n3）点击【确定】",
      "expected": "1）编辑成功；\n2）自动引入设置-数据源类型更新为全部"
    }
  ]
} as const;

test.describe("验证数据源自动引入设置-离线开发模块编辑功能正确", () => {
  test("C0483 验证数据源自动引入设置-离线开发模块编辑功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
