// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1038",
  "title": "验证「通用配置」项目隔离功能正常",
  "steps": [
    {
      "action": "进入数据资产-数据质量页面",
      "expected": "进入成功"
    },
    {
      "action": "选择项目A，进入「通用配置」页面，配置HIVE/DORIS维表",
      "expected": "配置成功"
    },
    {
      "action": "切换到项目B，进入「通用配置」页面",
      "expected": "配置项目隔离，不展示A项目已配置的维表设置"
    }
  ]
} as const;

test.describe("验证「通用配置」项目隔离功能正常", () => {
  test("C1038 验证「通用配置」项目隔离功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
