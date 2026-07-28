// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1109",
  "title": "验证【数据质量 规则集管理 规则配置-校验key选择】校验key支持多选和全选操作",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到规则集\"rule_set_multi_select_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"多选全选测试包\"中点击【新增规则】，添加有效性校验规则，按如下配置：\n- *字段：info（json）\n-*统计规则：格式-json格式校验\n展开「校验key」下拉框，分别勾选「user-name」「user-phone」「user-id」三个key",
      "expected": "三个key均成功勾选，复选框显示为选中状态"
    },
    {
      "action": "查看输入框的回显内容",
      "expected": "输入框回显格式为「user-name;user-phone;user-id」，多个key以分号分隔"
    },
    {
      "action": "点击下拉框中的「全部」选项",
      "expected": "列表中所有可选key（已配置value格式的key）全部被勾选，「全部」选项复选框显示为选中状态"
    },
    {
      "action": "再次点击「全部」选项取消全选",
      "expected": "所有key均取消勾选，「全部」选项复选框恢复为未选中状态，输入框回显清空"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-校验key选择】校验key支持多选和全选操作", () => {
  test("C1109 验证【数据质量 规则集管理 规则配置-校验key选择】校验key支持多选和全选操作", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
