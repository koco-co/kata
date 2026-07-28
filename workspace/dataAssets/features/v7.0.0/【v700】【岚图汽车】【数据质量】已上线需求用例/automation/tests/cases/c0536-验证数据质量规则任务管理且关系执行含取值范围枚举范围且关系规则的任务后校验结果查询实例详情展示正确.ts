// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0536",
  "title": "验证【数据质量 规则任务管理 且关系】执行含取值范围&枚举范围且关系规则的任务后校验结果查询实例详情展示正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成",
      "expected": "规则任务管理页面打开，任务列表显示已有任务数据行"
    },
    {
      "action": "在规则任务列表中点击任务 task_15695_and 对应行的【执行】按钮",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到 task_15695_and 最新实例记录并打开实例详情，查看规则名称为【取值范围&枚举范围】、字段为 score 的规则行",
      "expected": "实例详情中该规则行显示如下：\n1) 规则类型列显示「有效性校验」\n2) 规则名称列显示「取值范围&枚举范围」\n3) 质检结果列显示「校验不通过」\n4) 未通过原因列显示「不符合有效性规则」\n5) 详情说明列完整展示取值范围 >1、取值范围 <10 和枚举值 in '1,2,3' 三项条件均参与判断\n6) 操作列显示【查看详情】链接"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 且关系】执行含取值范围&枚举范围且关系规则的任务后校验结果查询实例详情展示正确", () => {
  test("C0536 验证【数据质量 规则任务管理 且关系】执行含取值范围&枚举范围且关系规则的任务后校验结果查询实例详情展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
