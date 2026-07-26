// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C039",
  "title": "验证数据质量项目管理增删改查功能入口",
  "steps": [
    {
      "action": "进入数据质量-项目管理页面",
      "expected": "页面加载成功，项目列表/卡片可见"
    },
    {
      "action": "验证项目增删改查功能入口",
      "expected": "新建/编辑/删除按钮可见"
    }
  ]
} as const;

test.describe("验证数据质量项目管理增删改查功能入口", () => {
  test("C039 验证数据质量项目管理增删改查功能入口", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
