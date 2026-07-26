// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C422",
  "title": "验证用户申请权限的权限",
  "steps": [
    {
      "action": "管理员用户登录",
      "expected": "1）表详情页-【申请权限】按钮置灰；\n2）数据地图搜搜结果页-【批量申请】按钮置灰"
    },
    {
      "action": "非管理员用户登录；\n该用户已经拥有表A的全部表级权限",
      "expected": "1）表详情页【申请权限】按钮置灰\n2）数据地图搜搜结果页，批量申请权限时不能勾选该表"
    },
    {
      "action": "非管理员用户登录；\n该用户已经拥有表A的部分表级权限",
      "expected": "1）表详情页【申请权限】按钮可点击\n2）数据地图搜搜结果页，批量申请权限时能勾选该表"
    }
  ]
} as const;

test.describe("验证用户申请权限的权限", () => {
  test("C422 验证用户申请权限的权限", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
