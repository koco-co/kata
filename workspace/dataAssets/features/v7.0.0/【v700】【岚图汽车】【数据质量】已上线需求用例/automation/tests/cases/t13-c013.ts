// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C013",
  "title": "验证编辑界面正常编辑多表唯一性判断",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】-选择weiyi_01，点击表名",
      "expected": "右侧弹出具体规则信息"
    },
    {
      "action": "选择一个唯一性校验，点击编辑",
      "expected": "唯一性校验具体配置框进入编辑状态"
    },
    {
      "action": "输入\n字段：name\n选择校验字段逻辑：唯一\n选择和其他表的校验关系：且\n选择对比表：test_weiyi_02\n选择对比表字段：name\n选择校验字段逻辑：唯一\n点击保存、下一步",
      "expected": "进入调度属性配置界面"
    },
    {
      "action": "点击立即执行-进入校验结果查询",
      "expected": "校验完成后状态显示校验通过"
    }
  ]
} as const;

test.describe("验证编辑界面正常编辑多表唯一性判断", () => {
  test("C013 验证编辑界面正常编辑多表唯一性判断", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
