// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0858",
  "title": "验证「内置规则」页面「规则名称」搜索功能正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」-「规则库配置」页面",
      "expected": "进入成功"
    },
    {
      "action": "输入已存在的规则名称「表行数检测」，点击搜索",
      "expected": "成功匹配出表行数相关所有的检测规则"
    },
    {
      "action": "输入不存在的规则名称「！@#¥%」，点击搜索",
      "expected": "返回暂无数据缺省页"
    },
    {
      "action": "输入「行数」，点击搜索",
      "expected": "模糊匹配出所有包含行数的检测规则"
    },
    {
      "action": "不输入内容，点击搜索",
      "expected": "默认返回所有的校验规则"
    },
    {
      "action": "输入超长字符，点击搜索",
      "expected": "提示字符超长"
    }
  ]
} as const;

test.describe("验证「内置规则」页面「规则名称」搜索功能正确", () => {
  test("C0858 验证「内置规则」页面「规则名称」搜索功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
