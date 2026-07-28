// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1178",
  "title": "验证【数据质量 通用配置-json格式校验管理 删除key】批量删除多条key（含子层级）",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面打开，列表显示已有key数据"
    },
    {
      "action": "在列表中勾选 batchKey1 和 batchKey2 两行的行选择框",
      "expected": "两行均显示勾选状态，列表上方出现批量操作栏"
    },
    {
      "action": "点击【批量删除】按钮",
      "expected": "弹出确认弹窗，提示文本为「请确认是否批量删除key信息，若存在子层级key信息会联动删除」"
    },
    {
      "action": "点击确认弹窗中的【确认】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表刷新，batchKey1、batchKey2 均从列表消失，batchKey1 的子层级 batchKey1Child 也不再存在"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 删除key】批量删除多条key（含子层级）", () => {
  test("C1178 验证【数据质量 通用配置-json格式校验管理 删除key】批量删除多条key（含子层级）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
