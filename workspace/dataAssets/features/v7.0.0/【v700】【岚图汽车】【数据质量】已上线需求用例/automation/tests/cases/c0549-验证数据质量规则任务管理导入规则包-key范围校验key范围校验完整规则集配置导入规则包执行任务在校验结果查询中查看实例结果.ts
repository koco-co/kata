// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0549",
  "title": "验证【数据质量 规则任务管理 导入规则包-key范围校验】key范围校验完整：规则集配置+导入规则包+执行任务+在校验结果查询中查看实例结果",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "点击【新建规则集】，在 Step 1 基础信息中配置如下：\n- *选择数据源: Doris\n-*选择数据库: qa_test\n- *选择数据表: test_json_key_range\n- 规则集描述: 无\n-*规则包名称: key范围校验测试包（点击【新增】按钮添加）\n点击【下一步】",
      "expected": "Step 1 基础信息校验通过，进入 Step 2 监控规则页面"
    },
    {
      "action": "在 Step 2 监控规则中，在\"key范围校验测试包\"下点击【新增规则】，配置如下：\n- *规则类型: 字段级\n-*字段: info\n- *统计函数: key范围校验\n- 过滤条件: 无\n-*校验方法: 包含\n- *校验内容: key1（姓名）和 key2（年龄）\n- 强弱规则: 强规则\n- 规则描述: 无\n点击规则行的【保存】按钮，再点击页面底部【保存】",
      "expected": "规则集保存成功，规则集列表新增 test_json_key_range 表对应的规则集记录，规则包\"key范围校验测试包\"下显示已保存的 key范围校验规则"
    },
    {
      "action": "进入【数据质量 → 规则任务管理】页面，点击【新建监控规则】，在 Step 1 基础信息中配置如下：\n- *规则名称: task_json_key_range_test\n-*选择数据源: Doris\n- *选择数据库: qa_test\n-*选择数据表: test_json_key_range\n点击【下一步】",
      "expected": "Step 1 基础信息校验通过，进入 Step 2 监控规则页面"
    },
    {
      "action": "在 Step 2 监控规则中，点击【导入规则包】，选择规则集管理中已配置的\"key范围校验测试包\"并确认导入",
      "expected": "规则包导入成功，Step 2 监控规则页面显示已导入的 key范围校验规则"
    },
    {
      "action": "点击【下一步】进入 Step 3 调度属性，填写调度属性后点击【保存】",
      "expected": "规则任务创建成功，返回任务列表可见\"task_json_key_range_test\""
    },
    {
      "action": "在规则任务列表中找到\"task_json_key_range_test\"，点击【立即执行】",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到\"task_json_key_range_test\"最新实例记录并打开实例详情",
      "expected": "1) 本次执行生成新的实例记录，任务名称、执行时间与本次操作匹配\n2) 实例详情中该规则行显示：id=1（含key1和key2）质检结果=校验通过\n3) id=2（仅含key1，缺key2）和 id=3（缺key1）质检结果=校验不通过"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 导入规则包-key范围校验】key范围校验完整：规则集配置+导入规则包+执行任务+在校验结果查询中查看实例结果", () => {
  test("C0549 验证【数据质量 规则任务管理 导入规则包-key范围校验】key范围校验完整：规则集配置+导入规则包+执行任务+在校验结果查询中查看实例结果", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
