// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C334",
  "title": "验证「抽样检查设置」-「过滤条件设置」交互正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "开启「抽样检查配置」",
      "expected": "开启成功"
    },
    {
      "action": "勾选「过滤条件设置」",
      "expected": "勾选成功"
    },
    {
      "action": "取消勾选「过滤条件设置」",
      "expected": "取消勾选成功"
    },
    {
      "action": "选择「选项配置」，点击配置",
      "expected": "弹「过滤条件配置」弹窗"
    },
    {
      "action": "选择字段age<= 100,确定",
      "expected": "保存成功，页面回显正确"
    },
    {
      "action": "选择「手动配置」，输入age<=100,确定",
      "expected": "保存成功，页面回显正确"
    },
    {
      "action": "修改输入内容/选择内容(id!=2)，保存",
      "expected": "保存成功，页面回显正确"
    }
  ]
} as const;

test.describe("验证「抽样检查设置」-「过滤条件设置」交互正确", () => {
  test("C334 验证「抽样检查设置」-「过滤条件设置」交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
