// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0343",
  "title": "验证【有效性校验，日期格式增加\"YYYY-MM-DD hh:mm:ss\"格式】日期格式增加\"YYYY-MM-DD hh:mm:ss\"格式（编辑监控规则-新增/编辑有效性验证）",
  "steps": [
    {
      "action": "进入【资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "找到【test】规则，点击【编辑】按钮",
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
      "action": "找到已有的有效性验证，点击【编辑】按钮",
      "expected": "进入[监控对象]配置页面"
    },
    {
      "action": "有效性校验配置调整如下：[字段] registration_date[统计规则] 格式-日期格式-date-time YYYY-MM-DD hh:mm:ss 期望值 占比>=10%",
      "expected": "统计规则-日期格式下有\"YYYY-MM-DD hh:mm:ss\"格式，且校验结果符合设计逻辑"
    },
    {
      "action": "点击【添加规则】按钮-选择[有效性验证]",
      "expected": "页面新增[唯一性验证]配置栏"
    },
    {
      "action": "有效性校验配置如下：[字段] registration_date[统计规则] 格式-日期格式-date-time YYYY-MM-DD hh:mm:ss 期望值 固定值>= 2025-12-10 10:26:33",
      "expected": "统计规则-日期格式下有\"YYYY-MM-DD hh:mm:ss\"格式，且校验结果符合设计逻辑"
    }
  ]
} as const;

test.describe("验证【有效性校验，日期格式增加\"YYYY-MM-DD hh:mm:ss\"格式】日期格式增加\"YYYY-MM-DD hh:mm:ss\"格式（编辑监控规则-新增/编辑有效性验证）", () => {
  test("C0343 验证【有效性校验，日期格式增加\"YYYY-MM-DD hh:mm:ss\"格式】日期格式增加\"YYYY-MM-DD hh:mm:ss\"格式（编辑监控规则-新增/编辑有效性验证）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
