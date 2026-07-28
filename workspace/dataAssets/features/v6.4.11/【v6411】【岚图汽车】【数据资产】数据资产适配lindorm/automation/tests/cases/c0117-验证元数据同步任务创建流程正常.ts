// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0117",
  "title": "验证元数据同步任务创建流程正常",
  "steps": [
    {
      "action": "1）点击【元数据】-【元数据同步】-【新增周期同步任务】\n2）选择数据源${DATASOURCE_TYPE}\n3）选择数据库${DATABASE}\n4）选择数据表${TABLE}\n5）依次点击【添加】_【下一步】_【新增】按钮",
      "expected": "“新增周期同步任务”成功，任务列表展示同步任务，列信息正确，同步状态展示正常"
    }
  ]
} as const;

test.describe("验证元数据同步任务创建流程正常", () => {
  test("C0117 验证元数据同步任务创建流程正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
