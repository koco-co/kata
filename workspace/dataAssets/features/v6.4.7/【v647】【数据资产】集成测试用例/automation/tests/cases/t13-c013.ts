// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C013",
  "title": "验证通用业务属性-删除功能-逻辑正常",
  "steps": [
    {
      "action": "进入元模型管理页面",
      "expected": "页面加载成功，列表可见"
    },
    {
      "action": "点击业务属性行的\"删除\"按钮",
      "expected": "弹出二次确认弹窗"
    },
    {
      "action": "确认删除",
      "expected": "列表不显示该业务属性"
    },
    {
      "action": "进入 Doris 数据源类型的数据表详情页，查看「业务属性」",
      "expected": "该业务属性不显示"
    }
  ]
} as const;

test.describe("验证通用业务属性-删除功能-逻辑正常", () => {
  test("C013 验证通用业务属性-删除功能-逻辑正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
