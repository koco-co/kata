// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1124",
  "title": "验证【数据质量 规则集管理 规则配置-或关系】在规则集中配置取值范围&枚举范围规则或关系时保存成功",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面打开，列表显示已有规则集数据行"
    },
    {
      "action": "找到\"ruleset_15695_or\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"或关系校验包\"中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】，按顺序填写如下：\n- *字段: score\n-*取值范围行: 期望值输入 1，操作符选择 >\n- *条件关系: 选择【或】单选按钮\n-*枚举值行-枚举值类型: 选择 in\n- *枚举值行-枚举值信息: 依次输入 1、2、3\n- 强弱规则: 强规则\n- 过滤条件: 无\n- 规则描述: 无",
      "expected": "规则集编辑页 Step 2 打开，规则包名称显示\"或关系校验包\"，关联表显示 test_db.quality_test_num"
    },
    {
      "action": "点击【保存】按钮，再点击页面底部【保存】完成规则集保存",
      "expected": "规则保存成功，规则列表中新增规则的且或关系列显示「或」"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-或关系】在规则集中配置取值范围&枚举范围规则或关系时保存成功", () => {
  test("C1124 验证【数据质量 规则集管理 规则配置-或关系】在规则集中配置取值范围&枚举范围规则或关系时保存成功", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
