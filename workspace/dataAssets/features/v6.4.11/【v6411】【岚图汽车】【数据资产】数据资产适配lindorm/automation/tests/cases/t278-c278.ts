// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C278",
  "title": "验证新建数仓层级的功能",
  "steps": [
    {
      "action": "点击「新建数仓层级」",
      "expected": "弹出「新建数仓层级」弹窗"
    },
    {
      "action": "什么都不填写，点击确定",
      "expected": "中文名称、英文名称下出现提示：请输入名称\n绑定数据库下出现提示：请选择绑定数据库"
    },
    {
      "action": "填写中文名称、英文名称，选择绑定数据库，点击确定",
      "expected": "全局提示：新建成功\n列表新增该数仓层级"
    }
  ]
} as const;

test.describe("验证新建数仓层级的功能", () => {
  test("C278 验证新建数仓层级的功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
