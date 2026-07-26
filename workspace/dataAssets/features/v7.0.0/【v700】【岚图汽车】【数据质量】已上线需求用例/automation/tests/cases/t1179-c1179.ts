// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1179",
  "title": "验证【数据质量 通用配置-json格式校验管理 删除key】单个删除含子层级的key会联动删除子层级数据",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面正常加载，deleteParent 记录在列表中显示「+」图标"
    },
    {
      "action": "在key为 deleteParent 的行，点击操作列的【删除】按钮",
      "expected": "弹出确认弹窗，提示文本为「请确认是否删除key信息，若存在子层级key信息会联动删除」"
    },
    {
      "action": "点击确认弹窗中的【确认】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表刷新，deleteParent 记录从列表中消失，子层级 deleteChild 也不再存在"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 删除key】单个删除含子层级的key会联动删除子层级数据", () => {
  test("C1179 验证【数据质量 通用配置-json格式校验管理 删除key】单个删除含子层级的key会联动删除子层级数据", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
