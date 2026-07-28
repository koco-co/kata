// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1234",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」异常值填写/空填写无法提交/下一步",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【落标检查】页面",
      "expected": "进入成功"
    },
    {
      "action": "定位到测试用任务 【test】，点击 [编辑] 按钮",
      "expected": "进入 [检查范围] 配置页面"
    },
    {
      "action": "[检查范围] 不作填写，点击 [下一步] 按钮",
      "expected": "提示\"必填项未填写\"，无法跳转至 [选择字段] 配置页面"
    },
    {
      "action": "正确填写后点击 [下一步] 按钮",
      "expected": "进入 [选择字段] 配置页面"
    },
    {
      "action": "[选择字段] 不作填写，点击 [下一步] 按钮",
      "expected": "提示\"必填项未填写\"，无法跳转至 [调度配置] 配置页面"
    },
    {
      "action": "正确填写其他内容，[规则包数量]尝试输入中文/符号",
      "expected": "无法输入"
    },
    {
      "action": "正确填写其他内容，[规则包数量]填写1000，点击 [下一步] 按钮",
      "expected": "提示\"规则包数量不符\"，无法跳转至 [调度配置] 配置页面"
    },
    {
      "action": "正确填写后点击 [下一步] 按钮",
      "expected": "进入 [选择字段] 配置页面"
    },
    {
      "action": "该页面必填项都有默认值，尝试清空数值",
      "expected": "无操作渠道清空数值"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」异常值填写/空填写无法提交/下一步", () => {
  test("C1234 验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」异常值填写/空填写无法提交/下一步", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
