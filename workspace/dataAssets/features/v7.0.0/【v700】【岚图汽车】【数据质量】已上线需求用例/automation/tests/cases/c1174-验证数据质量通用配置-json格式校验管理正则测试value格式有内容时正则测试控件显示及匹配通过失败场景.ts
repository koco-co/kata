// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1174",
  "title": "验证【数据质量 通用配置-json格式校验管理 正则测试】value格式有内容时正则测试控件显示及匹配通过失败场景",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面打开，列表显示已有key数据"
    },
    {
      "action": "点击【新增】按钮，在弹窗中key输入框填写 regexTestKey，value格式输入框保持为空，查看弹窗内容",
      "expected": "弹窗中不显示「测试数据」输入框和「正则匹配测试」按钮"
    },
    {
      "action": "在value格式输入框中填写 ^\\\\d{6}$，查看弹窗变化",
      "expected": "弹窗动态显示「测试数据」输入框和「正则匹配测试」按钮"
    },
    {
      "action": "在「测试数据」输入框中填写 123456，点击【正则匹配测试】按钮",
      "expected": "显示匹配结果为「匹配成功」"
    },
    {
      "action": "清空「测试数据」输入框，填写 abcdef，点击【正则匹配测试】按钮",
      "expected": "显示匹配结果为「匹配失败」"
    },
    {
      "action": "清空value格式输入框内容，查看弹窗变化",
      "expected": "「测试数据」输入框和「正则匹配测试」按钮隐藏"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 正则测试】value格式有内容时正则测试控件显示及匹配通过失败场景", () => {
  test("C1174 验证【数据质量 通用配置-json格式校验管理 正则测试】value格式有内容时正则测试控件显示及匹配通过失败场景", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
