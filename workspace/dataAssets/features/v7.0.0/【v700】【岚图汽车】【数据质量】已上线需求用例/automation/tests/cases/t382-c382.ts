// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C382",
  "title": "验证「超时时间」配置内容交互",
  "steps": [
    {
      "action": "进入「资产-【数据资产】-【数据质量】-【规则任务管理】-调度属性」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "查看区域配置内容",
      "expected": "默认选择「不限制」"
    },
    {
      "action": "鼠标悬浮\"？\"",
      "expected": "悬浮提示：\"任务运行时长大于超时时间时平台将对其强制杀死。\""
    },
    {
      "action": "选择「自定义」",
      "expected": "弹出时间配置框，可配置小时、分钟"
    },
    {
      "action": "点击小时下拉框",
      "expected": "可选择\"00～23\""
    },
    {
      "action": "点击分钟下拉框",
      "expected": "可选择\"00～59\""
    }
  ]
} as const;

test.describe("验证「超时时间」配置内容交互", () => {
  test("C382 验证「超时时间」配置内容交互", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
