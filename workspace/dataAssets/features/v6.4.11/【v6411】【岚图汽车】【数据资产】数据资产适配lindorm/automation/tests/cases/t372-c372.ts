// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C372",
  "title": "验证【通用配置-json格式校验管理】导出列表数据完整流程正常",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】页面",
      "expected": "1)页面展示「导 入」「导 出」「新 增」按钮\n2)列表列包含「key」「中文名称」「value格式」「数据源类型」「创建人」「创建时间」「更新人」「更新时间」「操作」"
    },
    {
      "action": "按 key 名和数据源类型筛选后点击「导 出」并确认导出",
      "expected": "1)触发导出下载\n2)导出文件仅包含筛选后的 key 数据\n3)文件字段包含 key、中文名称、value格式、数据源类型"
    }
  ]
} as const;

test.describe("验证【通用配置-json格式校验管理】导出列表数据完整流程正常", () => {
  test("C372 验证【通用配置-json格式校验管理】导出列表数据完整流程正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
