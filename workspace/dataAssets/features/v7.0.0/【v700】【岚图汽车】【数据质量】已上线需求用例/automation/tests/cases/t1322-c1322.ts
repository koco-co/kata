// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1322",
  "title": "验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」数据源类型\"单选\"时，数据源仅支持单选，数据库支持选择\"全部\"/\"多选\"",
  "steps": [
    {
      "action": "进入【标准管理】-【标准映射】",
      "expected": "进入成功"
    },
    {
      "action": "点击【标准映射】按钮",
      "expected": "进入[标准映射]配置页面"
    },
    {
      "action": "【标准映射】配置如下：\n[标准目录] tst\n[数据标准] test\n[数据源类型] MySQL",
      "expected": "4. 数据源类型无\"全选\"项且根据选择变为\"MySQL‘，数据库支持\"全选\"/\"多选\"/\"单选\""
    },
    {
      "action": "确认【数据源】是否仅支持单选，且数据库支持\"全选\"/\"多选\"/\"单选\"",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」数据源类型\"单选\"时，数据源仅支持单选，数据库支持选择\"全部\"/\"多选\"", () => {
  test("C1322 验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」数据源类型\"单选\"时，数据源仅支持单选，数据库支持选择\"全部\"/\"多选\"", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
