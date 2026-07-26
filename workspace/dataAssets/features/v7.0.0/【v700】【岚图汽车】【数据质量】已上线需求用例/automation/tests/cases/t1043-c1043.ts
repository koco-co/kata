// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1043",
  "title": "验证「报告关联维表设置Doris」选择框必填项校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【通用配置】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「报告关联维表设置Doris」",
      "expected": "选择成功"
    },
    {
      "action": "未选择「数据源」时，点击「保存」按钮",
      "expected": "提示\"数据源为必选项，请选择内容后再进行保存\""
    },
    {
      "action": "选择「数据源」后，点击保存",
      "expected": "提示\"schema为必选项，请选择内容后再进行保存\""
    },
    {
      "action": "选择「schema」后，点击保存",
      "expected": "提示\"数据库为必选项，请选择内容后再进行保存\""
    },
    {
      "action": "选择「数据库」后，点击保存",
      "expected": "提示\"数据表为必选项，请选择内容后再进行保存\""
    },
    {
      "action": "选择「数据表」后，点击保存",
      "expected": "提示\"车辆数统计字段为必选项，请选择内容后再进行保存\""
    },
    {
      "action": "选择「车辆数统计字段」后，点击保存",
      "expected": "提示\"车系关联字段字段为必选项，请选择内容后再进行保存\""
    },
    {
      "action": "选择「车系关联字段」后，点击保存",
      "expected": "提示\"车型关联字段为必选项，请选择内容后再进行保存\""
    },
    {
      "action": "选择「车型关联字段」后，点击保存",
      "expected": "提示\"动力类型关联字段为必选项，请选择内容后再进行保存\""
    },
    {
      "action": "选择「动力类型关联字段」后，点击保存",
      "expected": "保存成功"
    }
  ]
} as const;

test.describe("验证「报告关联维表设置Doris」选择框必填项校验", () => {
  test("C1043 验证「报告关联维表设置Doris」选择框必填项校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
