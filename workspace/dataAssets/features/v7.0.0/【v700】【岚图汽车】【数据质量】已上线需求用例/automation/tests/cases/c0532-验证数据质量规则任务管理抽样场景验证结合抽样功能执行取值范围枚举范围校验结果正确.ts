// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0532",
  "title": "验证【数据质量 规则任务管理 抽样场景】 验证结合抽样功能执行取值范围&枚举范围校验结果正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成",
      "expected": "规则任务管理页面打开，任务列表显示已有任务数据行"
    },
    {
      "action": "点击任务 task_15695_sample 对应行的【执行】按钮",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到 task_15695_sample 最新实例记录并打开实例详情",
      "expected": "实例详情中该规则行显示如下：\n1) 质检结果列显示校验结果（校验通过或校验不通过），具体结果取决于实际抽样数据\n2) 实例详情中的统计信息显示参与校验的数据量约为总数据量的 50%（约5条）\n3) 详情说明中规则描述与配置一致"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 抽样场景】 验证结合抽样功能执行取值范围&枚举范围校验结果正确", () => {
  test("C0532 验证【数据质量 规则任务管理 抽样场景】 验证结合抽样功能执行取值范围&枚举范围校验结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
