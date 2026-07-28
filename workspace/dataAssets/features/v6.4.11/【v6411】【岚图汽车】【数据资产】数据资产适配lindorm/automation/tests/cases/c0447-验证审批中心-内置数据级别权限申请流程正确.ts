// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0447",
  "title": "验证审批中心-内置数据级别权限申请流程正确",
  "steps": [
    {
      "action": "admin用户进入【审批中心】-【流程管理】",
      "expected": "内置流程增加一条“数据级别权限申请（内置）”的流程，具体信息如下：\n流程名称：数据级别权限申请（内置）\n流程描述：数据级别权限的申请\n对接内容：数据资产：数据级别权限申请\n应用租户：全部租户\n是否应用：默认开启"
    },
    {
      "action": "编辑该流程",
      "expected": "该流程能够编辑成功"
    }
  ]
} as const;

test.describe("验证审批中心-内置数据级别权限申请流程正确", () => {
  test("C0447 验证审批中心-内置数据级别权限申请流程正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
