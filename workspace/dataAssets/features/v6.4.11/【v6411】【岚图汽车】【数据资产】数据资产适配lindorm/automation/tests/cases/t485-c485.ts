// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C485",
  "title": "验证数据源自动引入设置-自动引入设置开关提示逻辑正确",
  "steps": [
    {
      "action": "由开启到关闭",
      "expected": "二次确认提示：若关闭自动引入，对应子产品产生的所有meta数据源将不会自动引入到资产平台中”，关闭自动引入后，项目范围默认变为“全部”，且不可进行编辑操作"
    },
    {
      "action": "由关闭到开启",
      "expected": "二次确认提示：若开启自动引入，对应子产品生成的meta数据源将会自动引入到资产平台并自动创建周期同步任务，可通过编辑操作控制自动引入的项目范围以及数据源类型"
    }
  ]
} as const;

test.describe("验证数据源自动引入设置-自动引入设置开关提示逻辑正确", () => {
  test("C485 验证数据源自动引入设置-自动引入设置开关提示逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
