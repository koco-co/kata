// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C024",
  "title": "验证选择\"且\"选项且无\"唯一\"选择时正常报错提示",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】-单表校验规则",
      "expected": "进入监控对象界面"
    },
    {
      "action": "输入\n规则名称：weiyi_03\n选择数据源：已有数据源\n选择数据库：已有数据库\n选择数据表：已有数据表\n点击下一步",
      "expected": "进入监控规则界面"
    },
    {
      "action": "点击添加规则-唯一性校验",
      "expected": "展示唯一性校验具体配置框"
    },
    {
      "action": "输入\n选择校验字段逻辑：允许重复\n选择和其他表的校验关系：且\n选择对比表：test_weiyi_02\n选择对比表字段：id\n选择校验字段逻辑：允许重复\n点击保存",
      "expected": "提示：必须有一个字段校验逻辑选择唯一，否则规则无法生效"
    }
  ]
} as const;

test.describe("验证选择\"且\"选项且无\"唯一\"选择时正常报错提示", () => {
  test("C024 验证选择\"且\"选项且无\"唯一\"选择时正常报错提示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
