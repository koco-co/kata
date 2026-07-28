// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0508",
  "title": "验证通知配置页面内容展示正确",
  "steps": [
    {
      "action": "1. 进入资产页面\n2. 点击平台管理-通知中心-通知配置\n3. 页面UI内容校验",
      "expected": "展示【接收人】/【通知内容】/【查询】/【重置】/【新增】/【分页】按钮， 展示配置记录【接收人/通知模块/操作】列"
    }
  ]
} as const;

test.describe("验证通知配置页面内容展示正确", () => {
  test("C0508 验证通知配置页面内容展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
