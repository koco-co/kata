// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0004",
  "title": "验证【导出规则库】中的内置规则正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则库配置】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击导出规则库并保存",
      "expected": "保存成功"
    },
    {
      "action": "检查导出文件内容",
      "expected": "包含新增内置规则: 1) 及时性校验2) 周期性校验3) 数据变化趋势不再显示隐藏规则:1) 重复值检测2) NULL值检测"
    },
    {
      "action": "检查内置规则信息",
      "expected": "规则信息正确"
    }
  ]
} as const;

test.describe("验证【导出规则库】中的内置规则正确", () => {
  test("C0004 验证【导出规则库】中的内置规则正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
