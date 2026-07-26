// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C063",
  "title": "验证监控规则配置格式校验-自定义正则时新增自定义正则跳转正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】-单表校验规则",
      "expected": "进入监控对象界面"
    },
    {
      "action": "输入\n规则名称：正则_01\n选择数据源：已有数据源\n选择数据库：已有数据库\n选择数据表：已有数据表\n点击下一步",
      "expected": "进入监控规则界面"
    },
    {
      "action": "点击添加规则-有效性校验",
      "expected": "展示有效性校验具体配置框"
    },
    {
      "action": "点击新增自定义正则",
      "expected": "跳转至规则库-新增页面"
    },
    {
      "action": "新增规则后返回规则配置界面，点击选择规则下拉框",
      "expected": "正常展示上述所建自定义正则"
    }
  ]
} as const;

test.describe("验证监控规则配置格式校验-自定义正则时新增自定义正则跳转正常", () => {
  test("C063 验证监控规则配置格式校验-自定义正则时新增自定义正则跳转正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
