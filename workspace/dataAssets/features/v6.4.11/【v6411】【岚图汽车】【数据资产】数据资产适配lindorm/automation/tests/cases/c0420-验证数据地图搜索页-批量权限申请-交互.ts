// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0420",
  "title": "验证数据地图搜索页-批量权限申请-交互",
  "steps": [
    {
      "action": "勾选表A、表B，点击【批量权限申请】",
      "expected": "显示批量权限申请弹窗：\n    - “权限”为必选项，选项为：DQL，DML，DDL；默认都不勾选\n    - “有效期”为必选项，选项为：永久、选择日期；默认选择“永久”\n    - “申请原因”为必填项，默认为空"
    },
    {
      "action": "直接点击【确定】",
      "expected": "必填校验提示正确"
    },
    {
      "action": "1）勾选“权限”，选择有效期，输入申请原因\n2）点击【确定】",
      "expected": "弹窗消失，提示申请成功"
    }
  ]
} as const;

test.describe("验证数据地图搜索页-批量权限申请-交互", () => {
  test("C0420 验证数据地图搜索页-批量权限申请-交互", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
