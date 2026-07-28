// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1205",
  "title": "验证 「元数据」中 Doris 3.x 元模型配置功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【元数据】-【元模型管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "下滑找到Doris 3.x元模型",
      "expected": "doris3.x元模型位置在2.x的右侧"
    },
    {
      "action": "点击「编辑元模型」",
      "expected": "Doris 3.x支持采集的技术属性信息和Doris 2.x保持一致"
    }
  ]
} as const;

test.describe("验证 「元数据」中 Doris 3.x 元模型配置功能正常", () => {
  test("C1205 验证 「元数据」中 Doris 3.x 元模型配置功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
