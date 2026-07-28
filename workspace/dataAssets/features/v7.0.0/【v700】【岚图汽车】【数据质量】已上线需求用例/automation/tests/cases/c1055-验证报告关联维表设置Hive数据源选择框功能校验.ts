// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1055",
  "title": "验证「报告关联维表设置Hive」数据源选择框功能校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【通用配置】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「报告关联维表设置Hive」",
      "expected": "选择成功"
    },
    {
      "action": "未选择「数据源」时，点击「保存」按钮",
      "expected": "提示\"数据源为必选项，请选择内容后再进行保存\""
    },
    {
      "action": "点击「数据源」选择框",
      "expected": "展示为「暂无数据」缺省页"
    },
    {
      "action": "选择「数据源」hive",
      "expected": "选择成功"
    }
  ]
} as const;

test.describe("验证「报告关联维表设置Hive」数据源选择框功能校验", () => {
  test("C1055 验证「报告关联维表设置Hive」数据源选择框功能校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
