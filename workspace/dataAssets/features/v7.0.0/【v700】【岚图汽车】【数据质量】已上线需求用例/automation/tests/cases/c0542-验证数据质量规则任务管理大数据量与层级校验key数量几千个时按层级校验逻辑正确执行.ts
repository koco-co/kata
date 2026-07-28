// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0542",
  "title": "验证【数据质量 规则任务管理 大数据量与层级校验】key数量几千个时按层级校验逻辑正确执行",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成",
      "expected": "规则任务管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"task_json_large_key_test\"，点击【立即执行】",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到\"task_json_large_key_test\"最新实例记录并打开实例详情",
      "expected": "1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配\n2) 实例详情中 id=30（含key_l1_001和key_l2_001）=校验通过\n3) id=31（缺key_l2_001）=校验不通过\n4) id=32（不含任何目标key）=校验不通过\n5) 层级匹配逻辑正确，第一层级key不与第二层级key混淆"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 大数据量与层级校验】key数量几千个时按层级校验逻辑正确执行", () => {
  test("C0542 验证【数据质量 规则任务管理 大数据量与层级校验】key数量几千个时按层级校验逻辑正确执行", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
