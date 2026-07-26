// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1148",
  "title": "验证【数据质量 通用配置-json格式校验管理 key删除后关联影响】删除已被完整性和有效性校验规则引用的key后规则不受影响",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面正常加载，列表中显示 key 为 refTestKey 的记录"
    },
    {
      "action": "进入【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中配置规则集名称=rule_set_json_config_del_test、关联 Doris 数据源 quality_test_db.json_ref_key_link_test 表，并新增规则包\"json格式校验测试包\"，点击【下一步】",
      "expected": "规则集创建页面正常打开，Step 1 配置项可正常填写，点击【下一步】后进入 Step 2 监控规则"
    },
    {
      "action": "在 Step 2 监控规则中点击【新增规则】，新增完整性校验规则，配置如下：\n- *字段: info\n-*统计函数: key范围校验\n- *校验方法: 包含\n-*校验内容: refTestKey\n- 强弱规则: 强规则\n- 规则描述: 无\n点击规则行【保存】；再点击【新增规则】新增有效性校验规则，配置如下：\n- *字段: info\n-*统计规则: 格式-json格式校验\n- *校验key: refTestKey\n- 强弱规则: 强规则\n- 规则描述: 无\n点击规则行【保存】，再点击页面底部【保存】",
      "expected": "两条规则均保存成功，规则集列表中显示 rule_set_json_config_del_test"
    },
    {
      "action": "进入【数据质量 → 规则任务管理】页面，点击【新建监控规则】，在 Step 1 基础信息中配置规则名称=task_json_config_del_test，并关联同一 Doris 表，点击【下一步】",
      "expected": "规则任务创建页面正常打开，Step 1 配置保存成功并进入 Step 2 监控规则"
    },
    {
      "action": "在 Step 2 监控规则中通过【导入规则包】导入规则集\"rule_set_json_config_del_test\"的\"json格式校验测试包\"，点击【下一步】进入 Step 3 调度属性后点击【保存】",
      "expected": "导入的规则包内容正常展示，任务保存成功，规则任务列表中显示 task_json_config_del_test"
    },
    {
      "action": "返回【数据质量 → 通用配置】页面，在 key 为 refTestKey 的行点击操作列的【删除】按钮",
      "expected": "弹出确认弹窗，提示文本为「请确认是否删除key信息，若存在子层级key信息会联动删除」"
    },
    {
      "action": "在删除确认弹窗中点击【确认】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表刷新，refTestKey 记录从列表中消失"
    },
    {
      "action": "进入【数据质量 → 规则集管理】页面，找到 rule_set_json_config_del_test，点击【编辑】进入 Step 2 监控规则查看已配置规则",
      "expected": "Step 2 中仍正常展示完整性校验-key范围校验规则和有效性校验-value格式校验规则，规则配置的key范围/value格式字段显示原始配置值，页面未出现因 refTestKey 已删除导致的报错"
    },
    {
      "action": "进入【数据质量 → 规则任务管理】页面，找到 task_json_config_del_test，点击操作列的【立即执行】按钮",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到 task_json_config_del_test 最新实例记录并打开实例详情",
      "expected": "1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配\n2) 实例详情中可正常查看完整性校验-key范围校验规则和有效性校验-value格式校验规则的执行结果，任务最新状态为「校验通过」\n3) 页面未出现因 refTestKey 已删除导致的异常报错"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 key删除后关联影响】删除已被完整性和有效性校验规则引用的key后规则不受影响", () => {
  test("C1148 验证【数据质量 通用配置-json格式校验管理 key删除后关联影响】删除已被完整性和有效性校验规则引用的key后规则不受影响", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
