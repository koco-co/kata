// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C046",
  "title": "验证【数据目录】-【批量指定目录】-【批量发布】功能正确",
  "steps": [
    {
      "action": "【资源类型】默认选择”数据表“\n【发布目录】选择”TEST“\n【选择资源】选择“批量发布”\n【数据表】输入框输入\n\"${DATASOURCE_NAME}.${DATABASE}.${TABLE}\n${DATASOURCE_NAME}.${DATABASE}.${TABLE2} \"\n点击确定按钮",
      "expected": "提示“发布成功”"
    },
    {
      "action": "点击数据目录TEST",
      "expected": "右侧展示TABLE，TABLE2表信息"
    }
  ]
} as const;

test.describe("验证【数据目录】-【批量指定目录】-【批量发布】功能正确", () => {
  test("C046 验证【数据目录】-【批量指定目录】-【批量发布】功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
