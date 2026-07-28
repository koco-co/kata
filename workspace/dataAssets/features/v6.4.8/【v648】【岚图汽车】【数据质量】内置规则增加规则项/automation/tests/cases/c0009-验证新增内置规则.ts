// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0009",
  "title": "验证新增内置规则",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则库配置】页面",
      "expected": "进入成功"
    },
    {
      "action": "检查内置规则列表",
      "expected": "新增3个内置规则"
    },
    {
      "action": "检查新增内置规则: 及时性校验",
      "expected": "1) 规则名称: 及时性校验2) 规则解释: 多字段时间差校验3) 规则分类: 时效性校验4) 关联范围: 字段5) 规则描述: 比较两个时间类型字段之间的时间差是否符合要求，支持校验多个字段组时间差"
    },
    {
      "action": "检查新增内置规则: 周期性校验",
      "expected": "1) 规则名称: 周期性校验2) 规则解释: 单字段时间差校验3) 规则分类: 时效性校验4) 关联范围: 字段5) 规则描述: 比较时间字段内相邻两行数据的时间差是否符合要求"
    },
    {
      "action": "检查新增内置规则: 数据变化趋势",
      "expected": "1) 规则名称: 数据变化趋势2) 规则解释: 单调递增、单调递减校验3) 规则分类: 合理性校验4) 关联范围: 字段5) 规则描述: 比较字段内数据排序后是否符合单调递增/单调递减的逻辑"
    }
  ]
} as const;

test.describe("验证新增内置规则", () => {
  test("C0009 验证新增内置规则", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
