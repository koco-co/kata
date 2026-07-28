// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1231",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查结果」页面内容",
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
      "action": "UI Check",
      "expected": "【落标检查总览】\n[检查数据表][检查字段总数][达标字段数][标准达标率]\n【落标检查结果】\n[数据库搜索栏][数据表搜索栏][字段搜索栏][查询按钮][重置按钮][导出按钮]\n[勾选栏][数据源][数据库][表][字段][检查状态][是否达标][检查开始时间][检查结束时间][操作（查看详情）]\n[分页栏]\n以上内容正常显示"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查结果」页面内容", () => {
  test("C1231 验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查结果」页面内容", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
