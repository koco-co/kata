// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C893",
  "title": "验证【规则库配置❯】「内置规则-单调递增、单调递减校验」规则状态变更正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则库配置】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择【内置规则-单调递增、单调递减校验】, 开启规则状态",
      "expected": "开启成功"
    },
    {
      "action": "进入【规则集管理】, 新建规则集-监控规则配置页面",
      "expected": "进入成功"
    },
    {
      "action": "选择合理性校验后, 检查校验规则配置项",
      "expected": "1) 支持配置规则: 单调递增、单调递减校验\n2) 选择该规则包的任务支持配置该内置规则"
    },
    {
      "action": "返回规则库配置, 关闭【内置规则-单调递增、单调递减校验】规则状态",
      "expected": "关闭成功"
    },
    {
      "action": "重新进入规则集管理, 配置监控规则, 选择一致性校验",
      "expected": "1) 合理性校验中: 不再支持配置规则(单调递增、单调递减校验)\n2) 选择该规则包的任务也不支持配置该内置规则"
    },
    {
      "action": "返回规则库配置, 筛选出所有【规则分类】为合理性校验的内置规则, 并关闭规则状态",
      "expected": "关闭成功"
    },
    {
      "action": "重新进入规则集管理, 配置监控规则",
      "expected": "1) 添加规则中不再支持: 合理性校验\n2) 选择该规则包的任务也不支持配置该规则类型"
    }
  ]
} as const;

test.describe("验证【规则库配置❯】「内置规则-单调递增、单调递减校验」规则状态变更正常", () => {
  test("C893 验证【规则库配置❯】「内置规则-单调递增、单调递减校验」规则状态变更正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
