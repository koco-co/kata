// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1130",
  "title": "验证【数据质量 规则集管理 规则配置-字段类型限制】非json和string类型字段不可选择key范围校验",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"rule_set_field_type_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"字段类型测试包\"中点击【新增规则】，统计函数选择\"key范围校验\"，展开字段选择列表",
      "expected": "字段下拉框中，INT类型字段\"age\"、DATE类型字段\"create_date\"、BIGINT类型字段\"user_id\"均置灰不可选"
    },
    {
      "action": "点击\"age\"（INT类型）字段",
      "expected": "\"age\"字段无法被选中，字段选择框保持为空"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-字段类型限制】非json和string类型字段不可选择key范围校验", () => {
  test("C1130 验证【数据质量 规则集管理 规则配置-字段类型限制】非json和string类型字段不可选择key范围校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
