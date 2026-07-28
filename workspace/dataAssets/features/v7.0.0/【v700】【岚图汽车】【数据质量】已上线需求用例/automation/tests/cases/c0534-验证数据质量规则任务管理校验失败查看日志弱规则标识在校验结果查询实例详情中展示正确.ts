// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0534",
  "title": "验证【数据质量 规则任务管理 校验失败查看日志】弱规则标识在校验结果查询实例详情中展示正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成",
      "expected": "规则任务管理页面打开，任务列表显示已有任务数据行"
    },
    {
      "action": "点击任务 task_15695_weak 对应行的【执行】按钮",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到 task_15695_weak 最新实例记录并打开实例详情，查看规则行强弱规则标识",
      "expected": "实例详情中该规则行显示如下：\n1) 强弱规则列标识为「弱规则」\n2) 整体任务质量评分不因该弱规则不通过而降级"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 校验失败查看日志】弱规则标识在校验结果查询实例详情中展示正确", () => {
  test("C0534 验证【数据质量 规则任务管理 校验失败查看日志】弱规则标识在校验结果查询实例详情中展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
