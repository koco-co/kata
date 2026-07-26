// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1152",
  "title": "验证【数据质量 通用配置-json格式校验管理 导出】筛选后导出仅包含筛选结果数据",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面打开，列表显示已有key数据"
    },
    {
      "action": "在创建人筛选器中选择 <exportUser@dtstack.com>，等待列表筛选结果返回",
      "expected": "列表仅显示创建人为 <exportUser@dtstack.com> 的记录"
    },
    {
      "action": "点击【导出】按钮，在确认弹窗中点击【确认】，等待文件下载完成",
      "expected": "下载文件仅包含创建人为 <exportUser@dtstack.com> 的记录，不包含其他用户的数据"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导出】筛选后导出仅包含筛选结果数据", () => {
  test("C1152 验证【数据质量 通用配置-json格式校验管理 导出】筛选后导出仅包含筛选结果数据", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
