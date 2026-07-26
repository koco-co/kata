// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1139",
  "title": "验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验方法切换（包含与不包含）规则保存和执行结果差异",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"rule_set_method_switch\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"method_switch包\"中点击【新增规则】，配置如下：\n- *统计函数: key范围校验\n-*字段: info（json类型）\n- *校验方法: 包含\n-*校验内容: key1（姓名）和 key2（年龄）\n- 强弱规则: 强规则\n- 规则描述: 无\n点击【保存】按钮，再点击页面底部【保存】",
      "expected": "页面提示保存成功，规则列表中显示新增的规则行"
    },
    {
      "action": "进入【数据质量 → 规则任务管理】页面，找到\"task_json_method_switch\"，点击【立即执行】",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到\"task_json_method_switch\"最新实例记录并打开实例详情",
      "expected": "1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配\n2) 实例详情中 id=1（含key1和key2）质检结果=校验通过\n3) id=2（仅含key1，缺key2）质检结果=校验不通过，未通过原因=key范围校验未通过"
    },
    {
      "action": "返回规则集管理，编辑\"rule_set_method_switch\"，进入 Step 2 编辑该规则，将校验方法由\"包含\"改为\"不包含\"，点击【保存】",
      "expected": "规则保存成功，校验方法显示为\"不包含\""
    },
    {
      "action": "返回【数据质量 → 规则任务管理】页面，再次点击\"task_json_method_switch\"的【立即执行】",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到\"task_json_method_switch\"最新实例记录并打开实例详情",
      "expected": "1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配\n2) 实例详情中 id=1（含key1和key2，违反不包含规则）质检结果=校验不通过，详情说明=不符合规则key范围不包含\"key1-key2\"\n3) id=2（仅含key1，部分包含）质检结果=校验不通过，详情说明=不符合规则key范围不包含\"key1-key2\""
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验方法切换（包含与不包含）规则保存和执行结果差异", () => {
  test("C1139 验证【数据质量 规则集管理 规则配置-key范围校验基础功能】校验方法切换（包含与不包含）规则保存和执行结果差异", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
