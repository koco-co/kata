// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C535",
  "title": "验证【数据质量 规则任务管理 或关系】执行含取值范围&枚举范围或关系规则的任务后校验通过",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成",
      "expected": "规则任务管理页面打开，任务列表显示已有任务数据行"
    },
    {
      "action": "点击任务 task_15695_or 对应行的【执行】按钮",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到 task_15695_or 最新实例记录并打开实例详情",
      "expected": "实例详情中该规则行显示如下：\n1) 质检结果列显示「校验通过」\n2) 详情说明列显示「符合规则\"取值范围>1\"或\"枚举值in '1,2,3'\"」\n3) 操作列显示 --，不显示【查看详情】链接"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 或关系】执行含取值范围&枚举范围或关系规则的任务后校验通过", () => {
  test("C535 验证【数据质量 规则任务管理 或关系】执行含取值范围&枚举范围或关系规则的任务后校验通过", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
