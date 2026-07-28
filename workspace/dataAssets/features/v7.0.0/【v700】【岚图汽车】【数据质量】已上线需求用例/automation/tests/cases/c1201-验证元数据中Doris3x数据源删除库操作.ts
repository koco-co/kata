// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1201",
  "title": "验证 「元数据」中 Doris 3.x 数据源删除库操作",
  "steps": [
    {
      "action": "进入【数据资产】-【元数据】-【元数据管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择数据源类型为「Doris 3.x」的数据源, 点击进入",
      "expected": "进入成功"
    },
    {
      "action": "点击数据库, 选择一条记录, 点击「删除」按钮",
      "expected": "1) 弹出二次确认弹窗2) 删除库表操作仅针对资产平台内生效，不会影响底层数据库表信息"
    },
    {
      "action": "输入「数据库名」后, 点击删除按钮",
      "expected": "1) 弹窗关闭, 该表信息从资产平台中删除完成2) 可以通过元数据同步中, 重新将该库表同步至资产平台"
    }
  ]
} as const;

test.describe("验证 「元数据」中 Doris 3.x 数据源删除库操作", () => {
  test("C1201 验证 「元数据」中 Doris 3.x 数据源删除库操作", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
