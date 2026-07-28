// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0337",
  "title": "验证「抽样检查设置」-「字段内容去重设置」交互正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "开启「抽样检查配置」",
      "expected": "开启成功"
    },
    {
      "action": "勾选「字段内容去重设置」",
      "expected": "勾选成功"
    },
    {
      "action": "取消勾选「字段内容去重设置」",
      "expected": "取消勾选成功"
    },
    {
      "action": "选择单个字段",
      "expected": "单个字段选择成功"
    },
    {
      "action": "选择5/10/100个字段",
      "expected": "字段选择成功"
    },
    {
      "action": "删除字段",
      "expected": "字段删除成功"
    },
    {
      "action": "删除后添加字段",
      "expected": "添加成功"
    }
  ]
} as const;

test.describe("验证「抽样检查设置」-「字段内容去重设置」交互正确", () => {
  test("C0337 验证「抽样检查设置」-「字段内容去重设置」交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
