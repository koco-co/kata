// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C890",
  "title": "验证【数据质量-规则库管理 自定义SQL模版】编辑",
  "steps": [
    {
      "action": "点击编辑按钮",
      "expected": "成功进入编辑页面，面包屑正确：自定义sql模版 > 编辑自定义sql模版"
    },
    {
      "action": "编辑规则和新增校验规则一致，必填信息正确修改，点击保存",
      "expected": "修改成功"
    },
    {
      "action": "查看修改成功的内容",
      "expected": "在自定义sql模版列表、详情同步更新、引用的地方同步更新"
    },
    {
      "action": "再次点击编辑",
      "expected": "正确回显上次填写的内容"
    },
    {
      "action": "点击取消",
      "expected": "返回上一页，且已填写内容不保存"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版】编辑", () => {
  test("C890 验证【数据质量-规则库管理 自定义SQL模版】编辑", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
