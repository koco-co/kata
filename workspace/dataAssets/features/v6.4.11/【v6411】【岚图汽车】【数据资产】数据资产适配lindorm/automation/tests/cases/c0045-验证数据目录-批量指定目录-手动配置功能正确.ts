// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0045",
  "title": "验证【数据目录】-【批量指定目录】-【手动配置】功能正确",
  "steps": [
    {
      "action": "【批量指定目录】弹窗UI CHECK",
      "expected": "title 显示“批量指定目录”\n【资源类型】默认不可修改为“数据表”，鼠标hover“？” 提示“目前仅支持数据表的批量目录指定”\n【选择资源】为单选框，可选“手动配置”“批量发布”“整库发布”\n【数据源】为下拉框，数据源类型下拉框，联动数据源名称下拉框\n【数据库】下拉框\n【数据表】下拉框\n提示 “次操作将为已有归属目录的表重新指定数据目录”\n取消按钮，确定按钮，弹窗关闭按钮“X”"
    },
    {
      "action": "【资源类型】默认选择”数据表“\n【发布目录】选择”TEST“\n【选择资源】选择“手动配置”\n【数据源】数据源类型选择${DATASOURCE_TYPE},数据源名称选择${DATASOURCE_NAME}\n【数据库】选择${DATABASE}\n【数据表】选择${TABLE}\n点击确定按钮",
      "expected": "提示“发布成功”"
    },
    {
      "action": "点击数据目录TEST",
      "expected": "右侧展示TABLE表信息"
    }
  ]
} as const;

test.describe("验证【数据目录】-【批量指定目录】-【手动配置】功能正确", () => {
  test("C0045 验证【数据目录】-【批量指定目录】-【手动配置】功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
