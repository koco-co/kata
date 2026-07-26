// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C012",
  "title": "验证编辑界面正常克隆多表唯一性判断",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】-选择weiyi_01，点击表名",
      "expected": "右侧弹出具体规则信息"
    },
    {
      "action": "选择一个唯一性校验，点击克隆",
      "expected": "下方新增一个已配置的唯一性校验，配置内容与克隆源保持一致"
    },
    {
      "action": "点击立即执行-进入校验结果查询",
      "expected": "校验完成后状态显示校验通过"
    }
  ]
} as const;

test.describe("验证编辑界面正常克隆多表唯一性判断", () => {
  test("C012 验证编辑界面正常克隆多表唯一性判断", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
