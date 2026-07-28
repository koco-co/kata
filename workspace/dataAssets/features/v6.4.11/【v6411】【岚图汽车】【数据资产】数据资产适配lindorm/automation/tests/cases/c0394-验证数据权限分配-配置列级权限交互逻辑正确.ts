// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0394",
  "title": "验证「数据权限分配」-配置列级权限交互逻辑正确",
  "steps": [
    {
      "action": "点击编辑icon",
      "expected": "1）当前行“列级权限”变为可编辑状态；\n2）下拉选项为当前表所有字段，默认选中状态正确；"
    },
    {
      "action": "修改“列级权限”：\n1）“全部”改为col1、col2、col3；\n2）点击下拉框右侧的取消icon",
      "expected": "“列级权限”恢复为“全部”，且不可编辑状态；"
    },
    {
      "action": "修改“列级权限”：\n1）行级权限配置了col1和col4的条件\n2）“全部”改为col1、col2、col3；\n3）点击下拉框右侧的确认icon",
      "expected": "1）“列级权限”变为col1、col2、col3，且不可编辑状态；\n2）进入配置行级权限弹窗中，原先配置的其他字段（col4）的条件被删除"
    }
  ]
} as const;

test.describe("验证「数据权限分配」-配置列级权限交互逻辑正确", () => {
  test("C0394 验证「数据权限分配」-配置列级权限交互逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
