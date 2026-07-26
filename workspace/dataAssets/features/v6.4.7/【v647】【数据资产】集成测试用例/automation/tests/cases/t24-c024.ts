// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C024",
  "title": "验证数据库拾取-拾取流程",
  "steps": [
    {
      "action": "点击数据库拾取页面的新建拾取icon",
      "expected": "弹出新建拾取弹窗"
    },
    {
      "action": "点击拾取来源下拉框",
      "expected": "下拉项中可见 `Doris2.x` 等受支持的数据源类型"
    },
    {
      "action": "1）拾取类型选择词根管理\n2）拾取来源选择 `Doris2.x`\n3）拾取条件填写 `重复数 > 1`\n4）点击确定",
      "expected": "全局提示：新建拾取成功；拾取列表新增该拾取"
    },
    {
      "action": "1）拾取类型选择数据标准\n2）拾取来源选择 `Doris2.x`\n3）拾取条件填写 `重复数 > 1`\n4）点击确定",
      "expected": "全局提示：新建拾取成功；拾取列表新增该拾取"
    },
    {
      "action": "1）等待拾取完成\n2）查看拾取",
      "expected": "1）拾取成功\n2）拾取列表数据正确"
    }
  ]
} as const;

test.describe("验证数据库拾取-拾取流程", () => {
  test("C024 验证数据库拾取-拾取流程", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
