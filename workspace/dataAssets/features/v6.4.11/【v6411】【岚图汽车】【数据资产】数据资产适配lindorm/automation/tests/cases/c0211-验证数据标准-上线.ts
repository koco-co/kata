// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0211",
  "title": "验证数据标准-上线",
  "steps": [
    {
      "action": "1）当前用户为管理员用户\n2）新建标准流程，输入合格的业务属性值和技术属性值，点击【上线】",
      "expected": "1）页面跳转至数据标准列表页\n2）列表刷新展示新建的数据标准，且状态为“已上线”"
    },
    {
      "action": "1）当前用户为管理员用户\n2）数据标准列表页，对待上线标准，点击【上线】按钮",
      "expected": "该数据标准状态更新为“已上线”"
    },
    {
      "action": "1）当前用户为数据开发用户\n2）新建标准流程，输入合格的业务属性值和技术属性值，点击【上线】",
      "expected": "1）页面跳转至数据标准列表页\n2）列表刷新展示新建的数据标准，且状态为“待审批”"
    },
    {
      "action": "1）当前用户为数据开发用户\n2）数据标准列表页，对待上线标准，点击【上线】按钮",
      "expected": "该数据标准状态更新为“待审批”"
    }
  ]
} as const;

test.describe("验证数据标准-上线", () => {
  test("C0211 验证数据标准-上线", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
