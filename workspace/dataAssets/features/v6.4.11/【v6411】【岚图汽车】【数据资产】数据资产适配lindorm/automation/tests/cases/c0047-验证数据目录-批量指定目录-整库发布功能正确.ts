// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0047",
  "title": "验证【数据目录】-【批量指定目录】-【整库发布】功能正确",
  "steps": [
    {
      "action": "【资源类型】默认选择”数据表“\n【发布目录】选择”TEST“\n【选择资源】选择“整库发布”\n【数据源】数据源类型选择${DATASOURCE_TYPE},数据源名称选择${DATASOURCE_NAME}\n【数据库】选择${DATABASE}，勾选【全量数据库】\n点击确定按钮",
      "expected": "提示“发布成功”"
    },
    {
      "action": "点击数据目录TEST",
      "expected": "右侧展示${DATASOURCE_NAME}数据源下所有库下的表信息"
    }
  ]
} as const;

test.describe("验证【数据目录】-【批量指定目录】-【整库发布】功能正确", () => {
  test("C0047 验证【数据目录】-【批量指定目录】-【整库发布】功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
