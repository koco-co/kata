// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C064",
  "title": "验证【Z- score置信区间】编辑界面正常编辑已有格式校验-自定义正则校验规则",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】，选择任务zhixin_01点击表名",
      "expected": "右侧弹出具体规则信息"
    },
    {
      "action": "选择一个统计性校验，点击编辑",
      "expected": "统计性校验具体配置框进入编辑状态"
    },
    {
      "action": "期望值选择[-1.96，1.96]\n其余选项为默认，点击保存",
      "expected": "校验保存成功"
    },
    {
      "action": "点击立即执行-进入校验结果查询",
      "expected": "校验完成后状态显示校验通过"
    }
  ]
} as const;

test.describe("验证【Z- score置信区间】编辑界面正常编辑已有格式校验-自定义正则校验规则", () => {
  test("C064 验证【Z- score置信区间】编辑界面正常编辑已有格式校验-自定义正则校验规则", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
