// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0382",
  "title": "验证数据权限-「查看详情」功能正常",
  "steps": [
    {
      "action": "点击【查看详情】",
      "expected": "右侧显示查看详情抽屉"
    },
    {
      "action": "查看“权限范围”",
      "expected": "1）所选数据源显示正确\n2）数据库、数据表记录数据正确"
    },
    {
      "action": "查看“数据权限配置”",
      "expected": "1）表级权限正确；\n2）有效期正确；\n3）是否开启行列权限配置正确"
    },
    {
      "action": "未开启行列权限配置",
      "expected": "不显示“行列权限配置”部分"
    },
    {
      "action": "已开启行列权限配置，查看“行列权限配置”",
      "expected": "行列权限数据正确"
    }
  ]
} as const;

test.describe("验证数据权限-「查看详情」功能正常", () => {
  test("C0382 验证数据权限-「查看详情」功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
