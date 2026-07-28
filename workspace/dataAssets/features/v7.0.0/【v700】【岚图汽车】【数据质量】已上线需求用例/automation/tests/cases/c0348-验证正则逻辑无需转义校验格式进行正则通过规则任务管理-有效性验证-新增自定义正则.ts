// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0348",
  "title": "验证【正则逻辑无需转义】校验格式进行正则通过（规则任务管理-有效性验证-新增自定义正则）",
  "steps": [
    {
      "action": "进入【资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击【新建监控规则】按钮",
      "expected": "进入[监控对象]配置页面"
    },
    {
      "action": "监控对象配置如下：[规则名称]输入「test_rule」[选择数据源]选择「${DATASOURCE}」[选择数据库]选择「${DATABASE}」[选择数据表]选择「${TABLE}」[选择分区] 手动输入分区 - \"id=1\"",
      "expected": "[监控对象]配置完成"
    },
    {
      "action": "点击【下一步】按钮",
      "expected": "进入[监控规则]配置页面"
    },
    {
      "action": "点击【统计规则】-【新增自定义正则】按钮",
      "expected": "进入[新增自定义正则]配置页面"
    },
    {
      "action": "新增自定义正则配置如下：[规则名称] test[规则模式] 正则[规则类型] 有效性[关联范围] 字段级[规则描述] 邮箱验证[正则] 测试数据组[正则] 测试数据组 ^\\\\n+$（通过，针对项\"特殊字符\\\\n\"）    ^.+$（通过，针对项\"特殊字符.\"） ^\\\\\\\\+$ （通过，针对项\"\\\\\"）    ^[\\\\u4e00-\\\\u9fa5]+$（通过，针对项\"中文\"）[测试数据] 根据针对项填写",
      "expected": "【新增自定义正则】配置完成，根据测试数据组及测试数据判断数据库标准正则的页面通过情况"
    }
  ]
} as const;

test.describe("验证【正则逻辑无需转义】校验格式进行正则通过（规则任务管理-有效性验证-新增自定义正则）", () => {
  test("C0348 验证【正则逻辑无需转义】校验格式进行正则通过（规则任务管理-有效性验证-新增自定义正则）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
