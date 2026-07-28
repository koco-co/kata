// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0238",
  "title": "验证【标准管理】-【落标检查】-【落标检查任务】页面内容",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【落标检查】页面",
      "expected": "进入成功"
    },
    {
      "action": "UI Check",
      "expected": "【落标检查设置】 [数据表名/字段名搜索框][新建检查任务按钮][勾选框] [数据表名称][所属数据源][所属数据库][检查字段数/总字段数][检查周期][检查状态][标准达标率][不达标字段数/检查失败数][最近编辑时间][最近检查时间][操作（编辑/查看检查结果）] [批量开启按钮][批量关闭按钮] [分页栏] 以上内容正常显示"
    },
    {
      "action": "交互测试",
      "expected": "逻辑：数据源类型、检查数据源、检查目录、检查状态支持筛选查询，支持组合筛选查询，支持多选;最近修改时间、计划检查时间支持按照正序/倒序排列"
    }
  ]
} as const;

test.describe("验证【标准管理】-【落标检查】-【落标检查任务】页面内容", () => {
  test("C0238 验证【标准管理】-【落标检查】-【落标检查任务】页面内容", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
