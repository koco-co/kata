// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1202",
  "title": "验证 「元数据」中 Doris 3.x 数据源删除表操作",
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
      "action": "点击数据库, 进入数据表页面, 选择一条记录, 点击「删除」按钮",
      "expected": "1) 弹出二次确认弹窗: 「确定删除表\"${table}\"吗?」2) 删除方式支持删除元数据表和删除源表3) 输入的表名一致后可删除表"
    },
    {
      "action": "「删除方式」选择「删除元数据表」, 输入${表名}后, 点击「确定」",
      "expected": "1) 弹窗关闭, 该表信息从资产平台及其他子产品中删除完成2) 可以通过元数据同步中, 重新将该表同步至资产平台"
    }
  ]
} as const;

test.describe("验证 「元数据」中 Doris 3.x 数据源删除表操作", () => {
  test("C1202 验证 「元数据」中 Doris 3.x 数据源删除表操作", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
