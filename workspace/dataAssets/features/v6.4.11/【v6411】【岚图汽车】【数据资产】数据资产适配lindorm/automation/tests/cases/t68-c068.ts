// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C068",
  "title": "验证【文件治理】功能正常",
  "steps": [
    {
      "action": "点击表详情【文件治理】按钮",
      "expected": "展示【开始时间】【结束时间】【操作人】【状态】【治理前文件数】【治理后文件数】【操作】"
    },
    {
      "action": "空白页展示",
      "expected": "展示“暂无数据”"
    },
    {
      "action": "该表做小文件治理，再来查看",
      "expected": "正确展示合并记录信息"
    },
    {
      "action": "分页功能验证",
      "expected": "分页功能正确"
    }
  ]
} as const;

test.describe("验证【文件治理】功能正常", () => {
  test("C068 验证【文件治理】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
