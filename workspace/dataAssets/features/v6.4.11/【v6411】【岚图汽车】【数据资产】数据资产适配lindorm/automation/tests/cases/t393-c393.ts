// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C393",
  "title": "验证「数据权限分配」-配置行级权限交互逻辑正确",
  "steps": [
    {
      "action": "点击【配置行级权限】",
      "expected": "显示数据表行级权限配置弹窗，弹窗显示表单内容如下：\n“规则关系”单选项，选项为：“且”，“或”，默认选中“且”；\n字段配置组件-“选择字段”下拉项为所选表的所有字段；\n字段配置组件-“操作符”下拉项为：= 、!= 、包含 、正则、in、not in、null；\n字段配置组件-输入框；"
    },
    {
      "action": "配置行级权限弹窗中，配置多条权限关系如下：\ncol1 = value1 and col2 in (value2,value3) and  col3 is null\n点击【确定】",
      "expected": "弹窗关闭"
    },
    {
      "action": "再次进入配置行级权限弹窗，将“col3 is null”条件删除，点击【确定】",
      "expected": "弹窗关闭"
    },
    {
      "action": "行级权限弹窗中点击“+”号",
      "expected": "下方新增一组条件组件"
    },
    {
      "action": "行级权限弹窗中点击“删除”icon",
      "expected": "删除当前条件组件"
    },
    {
      "action": "行级权限弹窗中生成超过5组条件",
      "expected": "提示最多只支持5组条件"
    },
    {
      "action": "行级权限弹窗中操作符选择“null”",
      "expected": "右侧输入框为不可编辑状态"
    },
    {
      "action": "行级权限弹窗中右侧输入框输入超过200个字符",
      "expected": "提示输入超限"
    }
  ]
} as const;

test.describe("验证「数据权限分配」-配置行级权限交互逻辑正确", () => {
  test("C393 验证「数据权限分配」-配置行级权限交互逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
