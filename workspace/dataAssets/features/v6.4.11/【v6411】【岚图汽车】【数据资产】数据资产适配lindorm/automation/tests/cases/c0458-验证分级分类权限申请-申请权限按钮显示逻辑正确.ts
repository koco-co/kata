// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0458",
  "title": "验证分级分类权限申请-【申请权限】按钮显示逻辑正确",
  "steps": [
    {
      "action": "1）配置“保密”级别，“开放用户等级”为L3；\n2）L1、L2、L3、L4、L5用户分别进入当前页面（分级管理页面）",
      "expected": "1）L1、L2用户的“保密”级别【申请权限】按钮可点击；\n2）L3、L4、L5的用户的“保密”级别【申请权限】按钮不可点击；\n3）admin/未配置用户等级的用户的“保密”级别【申请权限】按钮隐藏；"
    },
    {
      "action": "L1用户已存在该级别的申请中的记录",
      "expected": "1）L1用户的“保密”级别【申请权限】按钮不可点击；\n2）hover提示：该级别数据权限正在申请中，不可再次申请。"
    },
    {
      "action": "L1用户的权限申请已通过审批",
      "expected": "1）L1用户的“保密”级别【申请权限】按钮不可点击；\n2）hover提示：已拥有该级别数据权限，无需申请权限。"
    },
    {
      "action": "L1用户的权限申请被驳回审批",
      "expected": "L1用户的“保密”级别【申请权限】按钮可点击；"
    }
  ]
} as const;

test.describe("验证分级分类权限申请-【申请权限】按钮显示逻辑正确", () => {
  test("C0458 验证分级分类权限申请-【申请权限】按钮显示逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
