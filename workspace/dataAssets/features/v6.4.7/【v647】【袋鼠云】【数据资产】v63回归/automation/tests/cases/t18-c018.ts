// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C018",
  "title": "验证项目信息编辑置顶和删除流程正确",
  "steps": [
    {
      "action": "进入【数据质量 → 项目管理】页面，等待项目列表加载完成",
      "expected": "列表展示项目“v63回归项目”"
    },
    {
      "action": "点击项目操作列【编辑】，等待编辑项目弹窗加载完成",
      "expected": "弹窗回显项目名称、项目标识、管理员、项目描述"
    },
    {
      "action": "将项目描述修改为“v63回归项目描述-已编辑”，点击【确定】，等待列表刷新完成",
      "expected": "项目描述更新为“v63回归项目描述-已编辑”"
    },
    {
      "action": "点击项目操作列【置顶】，等待列表刷新完成",
      "expected": "项目“v63回归项目”展示在列表顶部"
    },
    {
      "action": "点击项目操作列【删除】",
      "expected": "弹出删除确认，提示项目被删除后对应任务、规则将被删除且无法恢复"
    },
    {
      "action": "点击【取消】关闭删除确认，等待确认弹窗关闭",
      "expected": "项目未删除，列表仍展示“v63回归项目”"
    }
  ]
} as const;

test.describe("验证项目信息编辑置顶和删除流程正确", () => {
  test("C018 验证项目信息编辑置顶和删除流程正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
