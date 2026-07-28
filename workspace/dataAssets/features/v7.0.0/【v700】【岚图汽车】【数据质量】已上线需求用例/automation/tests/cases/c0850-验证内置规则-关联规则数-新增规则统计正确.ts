// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0850",
  "title": "验证「内置规则」-「关联规则数」-新增规则统计正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」-「规则库配置」页面",
      "expected": "进入成功"
    },
    {
      "action": "新增「完整性」-「表级」-「表行数检测」-「固定值」校验规则A",
      "expected": "新增成功"
    },
    {
      "action": "查看「完整性」-「表级」-「表行数检测」-「固定值」-「关联规则数」",
      "expected": "规则关联数统计+1"
    },
    {
      "action": "新增「统计性」-「字段级」-「异常值检测」-「IQR离群点数量」检验规则B",
      "expected": "新增成功"
    },
    {
      "action": "查看「统计性」-「字段级」-「异常值检测」-「IQR离群点数量」-「关联规则数」",
      "expected": "规则关联数统计+1"
    },
    {
      "action": "新增「有效性」-「字段级」-「字段长度」-「固定值」检验规则C",
      "expected": "新增成功"
    },
    {
      "action": "查看「有效性」-「字段级」-「字段长度」-「固定值」-「关联规则数」",
      "expected": "规则关联数统计+1"
    },
    {
      "action": "新增「唯一性」-「字段级」-「重复值检测」-「重复数-固定值」检验规则D",
      "expected": "新增成功"
    },
    {
      "action": "查看「唯一性」-「字段级」-「重复值检测」-「重复数-固定值」-「关联规则数」",
      "expected": "规则关联数统计+1"
    }
  ]
} as const;

test.describe("验证「内置规则」-「关联规则数」-新增规则统计正确", () => {
  test("C0850 验证「内置规则」-「关联规则数」-新增规则统计正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
