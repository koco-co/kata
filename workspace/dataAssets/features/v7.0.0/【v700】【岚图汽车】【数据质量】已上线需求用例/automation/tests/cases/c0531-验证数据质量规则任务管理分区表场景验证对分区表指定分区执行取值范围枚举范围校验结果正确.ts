// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0531",
  "title": "验证【数据质量 规则任务管理 分区表场景】 验证对分区表指定分区执行取值范围&枚举范围校验结果正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成",
      "expected": "规则任务管理页面打开，任务列表显示已有任务数据行"
    },
    {
      "action": "点击任务 task_15695_partition 对应行的【执行】按钮",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到 task_15695_partition 最新实例记录并打开实例详情",
      "expected": "实例详情中该规则行显示如下：\n1) 质检结果列显示「校验不通过」\n2) 仅 p20260401 分区数据参与校验（id=1 和 id=2）\n3) 不通过记录为 id=2(score=15>1 满足取值范围，但 category=4 不在枚举 '1,2,3' 内) 不通过\n4) p20260402 分区数据（id=3、id=4）未参与校验"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 分区表场景】 验证对分区表指定分区执行取值范围&枚举范围校验结果正确", () => {
  test("C0531 验证【数据质量 规则任务管理 分区表场景】 验证对分区表指定分区执行取值范围&枚举范围校验结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
