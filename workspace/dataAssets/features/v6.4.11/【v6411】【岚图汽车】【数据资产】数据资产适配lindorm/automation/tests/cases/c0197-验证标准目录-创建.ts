// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0197",
  "title": "验证标准目录-创建",
  "steps": [
    {
      "action": "1）点击目录区域右上角的“+”号；\n2）在下方显示的输入框中输入目录名称XXX，回车",
      "expected": "目录创建成功，下方目录结构中展示该一级目录XXX"
    },
    {
      "action": "hover已有目录XXX",
      "expected": "小气泡显示目录XXX全称"
    },
    {
      "action": "点击目录XXX右侧“...”",
      "expected": "1）弹出小弹窗\n2）弹窗显示“新建目录”，“编辑”，“删除”可选项"
    },
    {
      "action": "1）在目录XXX右侧点击“...”，点击“新建目录”\n2）在输入框中输入目录名称“YYY”，回车",
      "expected": "目录创建成功，XXX目录下显示YYY这个子目录"
    },
    {
      "action": "在目录XXX下再次创建子目录“YYY”，回车",
      "expected": "提示“同级节点不能重名”"
    }
  ]
} as const;

test.describe("验证标准目录-创建", () => {
  test("C0197 验证标准目录-创建", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
