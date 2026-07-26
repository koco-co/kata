// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C126",
  "title": "验证数据地图自动同步(离线建视图)",
  "steps": [
    {
      "action": "1）离线SQL任务执行SQL\n2）等待任务执行成功\n3）查看数据地图",
      "expected": "表/视图成功同步至数据地图，且元数据信息正确"
    }
  ]
} as const;

test.describe("验证数据地图自动同步(离线建视图)", () => {
  test("C126 验证数据地图自动同步(离线建视图)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
