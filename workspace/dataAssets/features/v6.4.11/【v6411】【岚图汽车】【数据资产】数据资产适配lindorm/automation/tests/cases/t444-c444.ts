// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C444",
  "title": "验证用户中心支持用户等级配置-创建账号功能正确",
  "steps": [
    {
      "action": "查看创建账号弹窗：\n1）进入【用户中心】-【用户管理】；\n2）点击【创建账号】",
      "expected": "1）创建弹窗增加“用户等级”单选下拉项；\n2）“用户等级”下拉选项为：L1、L2、L3、L4、L5；默认为空\n3）hover提示：用户等级可应用于数栈—数据资产中的数据权限模块，通过用户等级决定该用户可查看的数据权限级别。"
    },
    {
      "action": "1）“用户等级”选择“L2”；\n2）其他表单元素填写规范；\n3）点击【下一步】",
      "expected": "1）创建账号成功；\n2）该用户的“用户等级正确”"
    }
  ]
} as const;

test.describe("验证用户中心支持用户等级配置-创建账号功能正确", () => {
  test("C444 验证用户中心支持用户等级配置-创建账号功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
