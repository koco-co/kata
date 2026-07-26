// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C016",
  "title": "验证数据标准-新建标准并保存",
  "steps": [
    {
      "action": "进入【数据标准】-【标准定义】页面，点击【新建标准】；填写标准中文名、英文名、英文缩写、标准目录等必填业务属性后点击【保存】",
      "expected": "页面返回标准列表；新建标准出现在列表中；状态显示为“待上线”"
    }
  ]
} as const;

test.describe("验证数据标准-新建标准并保存", () => {
  test("C016 验证数据标准-新建标准并保存", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
