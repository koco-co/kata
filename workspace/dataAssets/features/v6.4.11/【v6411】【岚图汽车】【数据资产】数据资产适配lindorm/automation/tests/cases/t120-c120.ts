// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C120",
  "title": "验证【元数据同步】_【大量表】同步正常",
  "steps": [
    {
      "action": "1）点击【元数据】-【元数据同步】-【新增周期同步任务】\n2） 选择数据源${DATASOURCE_TYPE}\n3） 选择数据库${DATABASE}\n4） 选择全部表\n5）依次点击【添加】_【下一步】_【新增】按钮",
      "expected": "操作成功"
    },
    {
      "action": "1） 点击【元数据】-【元数据同步】-【新增周期同步任务】\n2） 选择数据源${DATASOURCE_TYPE}\n3）选择数据库${DATABASE}\n4）选择${A}表\n5）依次点击【添加】_【下一步】_【新增】按钮",
      "expected": "操作成功"
    }
  ]
} as const;

test.describe("验证【元数据同步】_【大量表】同步正常", () => {
  test("C120 验证【元数据同步】_【大量表】同步正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
