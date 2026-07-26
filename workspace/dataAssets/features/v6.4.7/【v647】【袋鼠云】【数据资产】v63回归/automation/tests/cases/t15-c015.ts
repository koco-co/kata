// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C015",
  "title": "验证任务实例查询展示通过异常和失败日志",
  "steps": [
    {
      "action": "进入【数据质量 → 任务实例查询】页面，等待实例列表加载完成",
      "expected": "实例列表正常展示"
    },
    {
      "action": "搜索“v63表行数任务”并打开最新实例详情",
      "expected": "实例状态为校验通过，表行数实际值为 `{row_cnt}`"
    },
    {
      "action": "搜索期望值被改错后的“v63唯一性任务”并打开最新实例详情",
      "expected": "实例状态为校验异常，nick_name 重复数实际值为 `{nick_name_dup_cnt}`"
    },
    {
      "action": "搜索 SQL 配置错误的测试实例并打开详情",
      "expected": "实例状态为运行失败或校验异常，详情中展示日志入口"
    },
    {
      "action": "点击日志入口并等待日志内容加载完成",
      "expected": "日志展示 SQL 执行失败原因，错误信息与配置错误一致"
    }
  ]
} as const;

test.describe("验证任务实例查询展示通过异常和失败日志", () => {
  test("C015 验证任务实例查询展示通过异常和失败日志", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
