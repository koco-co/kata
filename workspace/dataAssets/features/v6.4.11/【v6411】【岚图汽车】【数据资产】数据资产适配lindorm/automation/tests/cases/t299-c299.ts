// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C299",
  "title": "验证【规则库配置-自定义sql模版】自定义配置参数列表与参数类型选择正常",
  "steps": [
    {
      "action": "进入【数据质量 → 规则库配置 → 自定义sql模版】并点击「新增自定义sql模版」",
      "expected": "1)进入「新增自定义SQL模板」页面\n2)页面展示「基本信息」「自定义配置」「全局参数」"
    },
    {
      "action": "在「自定义配置」输入:\n- select count(*) from ${test_table} where ${column_name} is null\n查看参数列表",
      "expected": "1)参数列表自动解析 `${test_table}` 和 `${column_name}`\n2)参数配置中「类型」下拉包含「数值」「数组」「逻辑关系」「当前校验表」「当前校验表字段」「自定义参数」\n3)「参数名称」「参数说明」可编辑并校验必填"
    }
  ]
} as const;

test.describe("验证【规则库配置-自定义sql模版】自定义配置参数列表与参数类型选择正常", () => {
  test("C299 验证【规则库配置-自定义sql模版】自定义配置参数列表与参数类型选择正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
