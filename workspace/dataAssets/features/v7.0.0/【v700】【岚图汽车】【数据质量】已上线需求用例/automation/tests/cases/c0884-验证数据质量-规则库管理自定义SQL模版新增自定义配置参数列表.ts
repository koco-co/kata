// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0884",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置】参数列表",
  "steps": [
    {
      "action": "若输入sql无参数化",
      "expected": "参数列表显示暂无数据"
    },
    {
      "action": "输入sql包含3个参数化字段",
      "expected": "3个参数化字段成功显示在参数列表"
    },
    {
      "action": "修改输入sql的3个参数化字段改为2个参数化字段",
      "expected": "参数列表同步更新，仅展示2条"
    },
    {
      "action": "修改输入sql的2个参数化字段改为5个参数化字段",
      "expected": "参数列表同步更新，展示5条"
    },
    {
      "action": "全局参数不显示在参数列表",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置】参数列表", () => {
  test("C0884 验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置】参数列表", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
