// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1150",
  "title": "验证【数据质量 通用配置-json格式校验管理 大数据量场景】key数量达1000条以上时列表加载和搜索性能正常",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面在5秒内加载完成，列表正常展示，分页区域显示总条数为1000以上，每页显示20条"
    },
    {
      "action": "在搜索框中输入 key500，等待搜索结果返回",
      "expected": "搜索结果在3秒内返回，列表显示包含 key500 的记录"
    },
    {
      "action": "点击分页区域的第2页按钮，等待列表数据加载",
      "expected": "翻页在3秒内完成，列表显示第21-40条数据，页面无卡顿"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 大数据量场景】key数量达1000条以上时列表加载和搜索性能正常", () => {
  test("C1150 验证【数据质量 通用配置-json格式校验管理 大数据量场景】key数量达1000条以上时列表加载和搜索性能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
