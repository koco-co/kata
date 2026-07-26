// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C063",
  "title": "验证【表结构】-字段【添加标签】功能正常",
  "steps": [
    {
      "action": "“添加标签“部分输入标签名称；\n点击【取消】",
      "expected": "弹窗消失；\n标签不变"
    },
    {
      "action": "“添加标签“部分输入标签名称；\n点击【确定】",
      "expected": "弹窗消失；\n标签更新"
    },
    {
      "action": "点击【添加标签】；\n输入!abc123;\n点击【确定】",
      "expected": "提示：2-20个字符，不能以特殊字符及数字开头，只能包含特殊字符的\".\",\"_\"和\"-\""
    },
    {
      "action": "点击【添加标签】；\n输入123!abc;\n点击【确定】",
      "expected": "提示：2-20个字符，不能以特殊字符及数字开头，只能包含特殊字符的\".\",\"_\"和\"-\""
    },
    {
      "action": "点击【添加标签】；\n输入abc!123;\n点击【确定】",
      "expected": "提示：2-20个字符，不能以特殊字符及数字开头，只能包含特殊字符的\".\",\"_\"和\"-\""
    },
    {
      "action": "点击【添加标签】；\n输入aBc_123;\n点击【确定】",
      "expected": "字段标签添加成功；\n弹窗消失"
    },
    {
      "action": "点击【添加标签】；\n输入aBc.123;\n点击【确定】",
      "expected": "字段标签添加成功；\n弹窗消失"
    },
    {
      "action": "点击【添加标签】；\n输入aBc-123;\n点击【确定】",
      "expected": "字段标签添加成功；\n弹窗消失"
    },
    {
      "action": "点击【添加标签】；\n输入aBc-123和aBc.123\n点击【确定】",
      "expected": "字段标签添加成功；\n弹窗消失"
    }
  ]
} as const;

test.describe("验证【表结构】-字段【添加标签】功能正常", () => {
  test("C063 验证【表结构】-字段【添加标签】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
