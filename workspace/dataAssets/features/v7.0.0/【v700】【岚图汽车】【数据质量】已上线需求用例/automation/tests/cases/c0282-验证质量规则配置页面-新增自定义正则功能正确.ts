// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0282",
  "title": "验证「质量规则配置」页面-新增自定义正则功能正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮",
      "expected": "进入「监控对象」配置页"
    },
    {
      "action": "配置「监控对象」如下「规则名称」 输入 \"test\"「选择数据源」 选择 ${datasource}「选择数据库」选择${database}「选择数据表」选择${table}点击「下一步」按钮",
      "expected": "进入「监控规则配置」页面"
    },
    {
      "action": "点击「添加规则」按钮，选择「有效性校验」规则",
      "expected": "展示「有效性校验」规则配置项"
    },
    {
      "action": "「有效性校验」规则配置如下「字段」选择「id」「统计规则」选择「格式校验-自定义正则」点击「新增自定义正则」按钮",
      "expected": "弹「新增自定义正则」弹窗"
    },
    {
      "action": "「新增自定义正则」弹窗UI CHECK",
      "expected": "正确展示弹窗title-「新增自定义正则」「规则名称」必填项「规则模式」必选框「规则类型」必选框「关联范围」必选框「规则描述」必填项「正则」必填项「按钮」-「取消」「确定」「X」关闭弹窗按钮"
    },
    {
      "action": "新增自定义正则如下「规则名称」输入「test」「规则模式」选择「正则」「规则类型」选择「有效性」「关联范围」选择「字段级」「规则描述」输入「test」「正则」输入「^[1-9]\\\\d*$」点击「确定」按钮",
      "expected": "自定义正则新增成功"
    },
    {
      "action": "点击「请选择自定义正则」下拉框",
      "expected": "新增规则已刷新展示，且列表按照规则最后一次编辑时间倒序展示"
    }
  ]
} as const;

test.describe("验证「质量规则配置」页面-新增自定义正则功能正确", () => {
  test("C0282 验证「质量规则配置」页面-新增自定义正则功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
