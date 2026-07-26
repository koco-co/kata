// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C376",
  "title": "验证【项目管理-项目信息】项目删除与置顶功能正常",
  "steps": [
    {
      "action": "进入【数据质量 → 项目管理 → 项目信息】页面",
      "expected": "1)项目列表加载成功"
    },
    {
      "action": "点击目标项目「置顶」后再删除可删除项目",
      "expected": "1)置顶后项目排序更新\n2)删除确认后项目从列表移除\n3)当前正在使用项目不可被误删"
    }
  ]
} as const;

test.describe("验证【项目管理-项目信息】项目删除与置顶功能正常", () => {
  test("C376 验证【项目管理-项目信息】项目删除与置顶功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
