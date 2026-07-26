// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1151",
  "title": "验证【数据质量 通用配置-json格式校验管理 空列表与分页】搜索无结果时的空状态展示",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面打开，列表显示已有key数据"
    },
    {
      "action": "在搜索框中输入 nonExistKeyXyz123，等待搜索结果返回",
      "expected": "列表显示空状态「暂无数据」，不显示任何记录行，分页区域显示总条数为0"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 空列表与分页】搜索无结果时的空状态展示", () => {
  test("C1151 验证【数据质量 通用配置-json格式校验管理 空列表与分页】搜索无结果时的空状态展示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
