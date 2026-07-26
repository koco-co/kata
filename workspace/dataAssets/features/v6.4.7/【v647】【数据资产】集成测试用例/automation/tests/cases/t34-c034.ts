// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C034",
  "title": "验证单表校验-【自定义sql-单表逻辑】结果正确",
  "steps": [
    {
      "action": "新建单表规则，选择 doris_test 表；规则类型选择\"自定义SQL\"，分别输入样例一至样例五的 SQL，阈值配置固定值 < 10000",
      "expected": "规则创建成功；SQL 语法校验通过，规则列表显示新增记录"
    },
    {
      "action": "点击【立即运行】，等待实例完成，查看运行结果",
      "expected": "质量实例状态\"运行成功\"；所有样例 SQL 子规则结果均显示\"校验通过\"；样例五（SUM(id)=1）实际值为 1，< 10000"
    },
    {
      "action": "编辑规则，将阈值修改为固定值 < 0（使 SUM(id)=1 不满足条件）",
      "expected": "编辑保存成功，规则阈值已更新"
    },
    {
      "action": "再次点击【立即运行】，等待实例完成，查看运行结果",
      "expected": "质量实例状态\"运行成功\"；相关子规则结果显示\"校验不通过\"；实际值 1 不满足 < 0 的条件"
    }
  ]
} as const;

test.describe("验证单表校验-【自定义sql-单表逻辑】结果正确", () => {
  test("C034 验证单表校验-【自定义sql-单表逻辑】结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
