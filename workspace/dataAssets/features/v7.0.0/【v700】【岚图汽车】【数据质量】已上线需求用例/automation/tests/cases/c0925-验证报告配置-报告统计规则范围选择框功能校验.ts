// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0925",
  "title": "验证「报告配置」-「报告统计规则范围」选择框功能校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "进入成功"
    },
    {
      "action": "配置「数据源」「数据库」「数据表」",
      "expected": "选择成功"
    },
    {
      "action": "规则全选(完整性校验，有效性校验，唯一性校验，统计性校验)",
      "expected": "各规则模块均勾选成功，配置项展示正确"
    },
    {
      "action": "规则均配置",
      "expected": "配置完成"
    },
    {
      "action": "点击「下一步」",
      "expected": "进入【调度配置】页面"
    },
    {
      "action": "查看「报告配置」-「报告统计规则范围」",
      "expected": "默认选择全部已配置的规则(完整性校验，有效性校验，唯一性校验，统计性校验)"
    },
    {
      "action": "返回上一步，删除「有效性校验规则」「统计性校验规则」，再次查看「报告配置」-「报告统计规则范围」",
      "expected": "更新为「完整性校验规则」「唯一性校验规则」"
    },
    {
      "action": "返回上一步，复制「完整性校验规则」出「完整性校验规则2」，「唯一性校验规则」，再次查看「报告配置」-「报告统计规则范围」",
      "expected": "更新为「完整性校验规则」「完整性校验规则2」「唯一性校验规则」"
    },
    {
      "action": "编辑「报告统计规则范围」，单独勾选「完整性校验规则」",
      "expected": "仅展示「完整性校验规则」"
    }
  ]
} as const;

test.describe("验证「报告配置」-「报告统计规则范围」选择框功能校验", () => {
  test("C0925 验证「报告配置」-「报告统计规则范围」选择框功能校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
