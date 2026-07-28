// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1119",
  "title": "验证【数据质量 规则集管理 string类型字段强转double】 验证string类型字段在规则集中配置取值范围&枚举范围规则时系统可正常保存",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面打开，列表显示已有规则集数据行"
    },
    {
      "action": "找到\"ruleset_15695_str\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"string强转包\"中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】，按顺序填写如下：\n- *字段: score_str\n-*取值范围设置: > 1 【且】< 10\n- *枚举值设置: in 5、5.5、15\n-*取值范围和枚举值关系: 且\n- 强弱规则: 强规则\n- 过滤条件: 无\n- 规则描述: 无",
      "expected": "字段下拉框中 score_str（VARCHAR 类型）可被选中；枚举值类型以下拉框方式展示，默认回显【in】，展开后包含【in】和【not in】两个选项，规则配置表单正常展开"
    },
    {
      "action": "点击【保存】按钮，再点击页面底部【保存】完成规则集保存",
      "expected": "规则保存成功，string 类型字段可正常配置取值范围&枚举范围规则"
    },
    {
      "action": "在规则任务中引用该规则集并执行校验任务，等待任务运行完成后查看校验结果",
      "expected": "校验结果中 string 类型值被正确强转为 double 类型进行比较：\n1) '5' 强转为 5.0，满足 >1 且 <10，且属于枚举值 5、5.5、15，校验通过\n2) '5.0' 强转为 5.0，满足 >1 且 <10，且属于枚举值 5、5.5、15，校验通过\n3) '15.0' 强转为 15.0，虽属于枚举值 5、5.5、15，但不满足 <10，校验失败\n4) 'abc' 无法转为 double，空值\n5) '-1.0' 强转为 -1.0，不满足 >1，校验失败"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 string类型字段强转double】 验证string类型字段在规则集中配置取值范围&枚举范围规则时系统可正常保存", () => {
  test("C1119 验证【数据质量 规则集管理 string类型字段强转double】 验证string类型字段在规则集中配置取值范围&枚举范围规则时系统可正常保存", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
