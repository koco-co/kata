// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C014",
  "title": "验证任务实例查询支持搜索实例和查看规则明细",
  "steps": [
    {
      "action": "进入【数据质量 → 任务实例查询】页面，等待实例列表加载完成",
      "expected": "页面 URL 为 `#/dq/taskQuery`，列表展示表名、任务名称、执行时间、校验状态"
    },
    {
      "action": "在搜索条件输入任务名称“v63完整性字段级任务”，点击【查询】，等待列表刷新完成",
      "expected": "列表仅展示匹配该任务名称的实例记录"
    },
    {
      "action": "点击实例表名或详情入口，等待详情抽屉加载完成",
      "expected": "抽屉展示任务基础信息、规则结果和校验未通过统计"
    },
    {
      "action": "在 user_code 空值数规则卡片点击【查看明细】，等待明细表格加载完成",
      "expected": "明细表格展示 user_code 为空的记录；明细数量和样例 id 与 `SELECT id FROM dq_test_user_info_300 WHERE user_code IS NULL LIMIT 20` 查询结果一致"
    },
    {
      "action": "点击【查看趋势】，等待趋势图加载完成",
      "expected": "趋势图展示该规则最近执行记录，当前执行点实际值为 `{user_code_null_cnt}`"
    }
  ]
} as const;

test.describe("验证任务实例查询支持搜索实例和查看规则明细", () => {
  test("C014 验证任务实例查询支持搜索实例和查看规则明细", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
