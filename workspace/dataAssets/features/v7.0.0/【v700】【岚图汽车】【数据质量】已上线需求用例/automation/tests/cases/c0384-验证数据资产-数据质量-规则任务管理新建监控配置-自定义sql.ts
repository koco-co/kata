// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0384",
  "title": "验证【「数据资产」-「数据质量」-「规则任务管理」】新建监控配置-自定义sql",
  "steps": [
    {
      "action": "点击新建监控配置，「监控对象」配置页面正确填写，点击下一步",
      "expected": "成功进入「监控规则」配置页面"
    },
    {
      "action": "点击添加规则，选择自定义SQL，规则类型选择：完整性，引用规则选择：自定义SQL模版xx",
      "expected": "填写正确"
    },
    {
      "action": "查看sql面板",
      "expected": "sql回显正确"
    },
    {
      "action": "查看参数列表",
      "expected": "参数列表回显正确"
    },
    {
      "action": "选择校验字段，校验方法、期望值、强弱规则、规则描述",
      "expected": "输入正确"
    },
    {
      "action": "「监控规则」配置页面所有信息正确填写，点击下一步",
      "expected": "成功进入「调度属性」配置页面"
    },
    {
      "action": "「调度属性」配置页面所有信息均正确填写，点击新建",
      "expected": "新增监控配置成功"
    }
  ]
} as const;

test.describe("验证【「数据资产」-「数据质量」-「规则任务管理」】新建监控配置-自定义sql", () => {
  test("C0384 验证【「数据资产」-「数据质量」-「规则任务管理」】新建监控配置-自定义sql", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
