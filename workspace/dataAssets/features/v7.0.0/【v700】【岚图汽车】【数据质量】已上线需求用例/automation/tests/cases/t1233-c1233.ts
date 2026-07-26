// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1233",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」-「检查任务详情」页面内容",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【落标检查】页面",
      "expected": "进入成功"
    },
    {
      "action": "在【落标检查任务】页面找到【test】表，点击【test】",
      "expected": "弹出【test】表详情页面"
    },
    {
      "action": "【检查范围】\n[数据表名称][所属数据库][所属数据源]\n[检查数据范围][标准来源][车型信息关联字段]\n【检查字段列表】\n[字段]\n[分页栏]\n[检查项]（精度倍数/数据精度/值域范围/数据长度/空值数/重复数）\n[规则包]\n【调度周期】\n[检查周期][生效日期][具体时间][告警方式][接收人]\n【检查结果总览】\n[开始检查时间][结束检查时间][检查字段数][标准达标率][不达标字段数/检查失败数][检查状态]\n[分页栏]\n以上内容正常显示",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」-「检查任务详情」页面内容", () => {
  test("C1233 验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」-「检查任务详情」页面内容", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
