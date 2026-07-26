// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C230",
  "title": "验证标准映射-标准映射字段绑功能正常",
  "steps": [
    {
      "action": "1）点击邮箱地址的【字段映射】；\n2）查看字段绑定弹窗",
      "expected": "操作成功"
    },
    {
      "action": "“数据源类型”选择${DATASOURCE_TYPE}数据源类型",
      "expected": "“数据源”下拉项显示${DATASOURCE_TYPE}数据源类型下的数据源"
    },
    {
      "action": "“数据源”选择${DATASOURCE_TYPE}数据源类型下的数据源",
      "expected": "“数据库”下拉项显示所选数据源下所有已同步的数据库"
    },
    {
      "action": "“数据库”选择数据库",
      "expected": "“数据表”选择所选库下所有已同步的数据表"
    },
    {
      "action": "选择“数据表”，点击【确定】",
      "expected": "字段绑定成功"
    },
    {
      "action": "查看对数据标准的“映射记录”",
      "expected": "映射记录显示新绑定字段"
    }
  ]
} as const;

test.describe("验证标准映射-标准映射字段绑功能正常", () => {
  test("C230 验证标准映射-标准映射字段绑功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
