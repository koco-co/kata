// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C927",
  "title": "验证「报告配置」-「报告名称」输入框功能校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "当中文名没有时展示表英文名+数据质量报告"
    },
    {
      "action": "配置「数据源」「数据库」「数据表」，选择【完整性校验】规则",
      "expected": "选择成功，展示【完整性校验】规则配置项"
    },
    {
      "action": "【完整性校验】规则均配置",
      "expected": "配置完成"
    },
    {
      "action": "点击「下一步」",
      "expected": "进入【调度配置】页面"
    },
    {
      "action": "「报告配置」查看「报告名称」",
      "expected": "1. 默认展示校验表中文名+数据质量报告"
    },
    {
      "action": "编辑原配置的表，由表A->表B",
      "expected": "「报告配置」-「报告名称」自动更新正确"
    },
    {
      "action": "手动编辑「报告名称」，输入特殊字符！@#¥%……",
      "expected": "无法保存"
    },
    {
      "action": "输入超长字符",
      "expected": "无法保存"
    },
    {
      "action": "输入已存在的报告名称",
      "expected": "提示\"已存在相同的报告名称\""
    },
    {
      "action": "输入不存在且有效的报告名称",
      "expected": "保存成功"
    },
    {
      "action": "运行任务，进入【数据质量报告】页面查看报告",
      "expected": "报告名称展示正确"
    }
  ]
} as const;

test.describe("验证「报告配置」-「报告名称」输入框功能校验", () => {
  test("C927 验证「报告配置」-「报告名称」输入框功能校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
