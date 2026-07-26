// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1229",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查结果」-「查看详情」页面内容",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "切换到【落标检查结果】",
      "expected": "切换成功"
    },
    {
      "action": "找到测试用数据，点击 [查看详情] 按钮",
      "expected": "弹出详情页面"
    },
    {
      "action": "UI Check",
      "expected": "【检查信息】\n[数据源][数据库][数据表][字段]\n【检查结果】\n[检查项][是否达标][检查开始时间][检查结束时间][操作（查看日志/查看详情）]\n【关联标准详情】\n[标准信息]\n[版本变更]\n以上内容正常显示"
    },
    {
      "action": "原型图中【标准管理】-【落标检查】-【落标检查结果】-【查看详情】-【检查结果】无分页栏",
      "expected": "6. 点击 [检查开始时间] 排序按钮"
    },
    {
      "action": "交互测试",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查结果」-「查看详情」页面内容", () => {
  test("C1229 验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查结果」-「查看详情」页面内容", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
