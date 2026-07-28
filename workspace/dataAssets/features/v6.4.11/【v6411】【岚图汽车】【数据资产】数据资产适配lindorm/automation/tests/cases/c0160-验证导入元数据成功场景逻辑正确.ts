// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0160",
  "title": "验证导入元数据成功场景逻辑正确",
  "steps": [
    {
      "action": "点击【导入元数据】->选择数据源-> 上传excel文件；\nexcel文件中数据正确；\n点击【确定】",
      "expected": "导入弹窗消失；\n提示：导入成功，请前往「元数据同步」模块进行同步操作。\n「元数据同步」可点击跳转至元数据同步页面；"
    },
    {
      "action": "元数据管理页面，筛选该数据源类型；\n点击进入表详情页",
      "expected": "该表基本信息显示正确"
    }
  ]
} as const;

test.describe("验证导入元数据成功场景逻辑正确", () => {
  test("C0160 验证导入元数据成功场景逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
