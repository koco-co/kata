// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1123",
  "title": "验证【数据质量 规则集管理 规则配置-仅取值范围配置】在规则集中仅填写取值范围可正常保存",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面打开，列表显示已有规则集数据行"
    },
    {
      "action": "找到\"ruleset_15695_range\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"仅取值范围包\"中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】，按顺序填写如下：\n- *字段: score\n-*取值范围行: 期望值输入 0，操作符选择 >=\n- *枚举值行: 不填写，保持为空\n- 强弱规则: 强规则\n- 过滤条件: 无\n- 规则描述: 无",
      "expected": "规则集编辑页 Step 2 打开，规则包名称显示\"仅取值范围包\"，关联表显示 test_db.quality_test_num"
    },
    {
      "action": "点击【保存】按钮，再点击页面底部【保存】完成规则集保存",
      "expected": "规则保存成功，规则列表中对应规则显示如下：\n1) 取值范围列显示 >=0\n2) 枚举值设置列显示 --\n3) 且或关系列不显示（仅一项规则时无需关系）"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-仅取值范围配置】在规则集中仅填写取值范围可正常保存", () => {
  test("C1123 验证【数据质量 规则集管理 规则配置-仅取值范围配置】在规则集中仅填写取值范围可正常保存", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
