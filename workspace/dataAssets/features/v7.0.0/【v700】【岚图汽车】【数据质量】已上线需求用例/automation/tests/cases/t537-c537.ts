// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C537",
  "title": "验证【数据质量 规则任务管理 抽样与分区场景】对分区表配置key范围校验规则指定分区下数据校验正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成",
      "expected": "规则任务管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"task_json_partition_test\"，点击【立即执行】",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到\"task_json_partition_test\"最新实例记录并打开实例详情",
      "expected": "1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配\n2) 仅校验dt=20260401分区下的数据（id=1和id=2）\n3) id=1（含key1和key2）质检结果=校验通过\n4) id=2（仅含key1，缺key2）质检结果=校验不通过\n5) dt=20260402分区的数据（id=3）不参与本次校验"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 抽样与分区场景】对分区表配置key范围校验规则指定分区下数据校验正确", () => {
  test("C537 验证【数据质量 规则任务管理 抽样与分区场景】对分区表配置key范围校验规则指定分区下数据校验正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
