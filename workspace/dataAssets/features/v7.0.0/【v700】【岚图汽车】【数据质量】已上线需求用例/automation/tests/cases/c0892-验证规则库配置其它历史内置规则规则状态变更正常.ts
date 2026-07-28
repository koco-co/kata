// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0892",
  "title": "验证【规则库配置❯】「其它历史内置规则」规则状态变更正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则库配置】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择【其它历史内置规则】, 开启所有规则状态",
      "expected": "开启成功"
    },
    {
      "action": "进入【规则集管理】, 新建规则集-监控规则配置页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「添加规则」, 检查下拉框数据",
      "expected": "历史规则分类正常选择"
    },
    {
      "action": "选择完整性校验, 检查校验规则块中可选的内置规则",
      "expected": "所有内置规则均可选择"
    },
    {
      "action": "依次选择有效性校验、唯一性校验、统计性校验, 检查规则块中的可选内置规则",
      "expected": "所有内置规则均可选择"
    },
    {
      "action": "在「规则库配置」中, 关闭完整性校验~统计性校验的内置规则",
      "expected": "规则状态全部关闭"
    },
    {
      "action": "重新进入【规则集管理】, 新建规则集-监控规则配置页面, 检查添加规则后的可选内置规则",
      "expected": "已关闭的内置规则不再支持选择"
    }
  ]
} as const;

test.describe("验证【规则库配置❯】「其它历史内置规则」规则状态变更正常", () => {
  test("C0892 验证【规则库配置❯】「其它历史内置规则」规则状态变更正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
