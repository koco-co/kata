// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0019",
  "title": "验证规则任务配置规则包后校验正常(2规则包 * 2校验规则)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "新建监控规则, 配置如下:",
      "expected": "执行成功, 校验结果: 校验不通过"
    },
    {
      "action": "监控对象: - 规则名称: rule01 - 数据表: dwd_voyah_sales_time_quality - 选择分区: pt_date='20260204' / data_type='abnormal_monotonicity'",
      "expected": "显示表数据中未通过的数据"
    },
    {
      "action": "监控规则: 引入规则包1(完整性校验、合理性校验)、规则包2(时效性校验) 完整性校验: - 生效范围: 字段级 - 字段: order_id - 统计函数: 字段取值校验 - 期望值: >= 0 合理性校验: - 字段: order_id - 统计函数: 数据变化趋势 - 过滤条件: / - 排序字段: order_id - 校验方法: 单调递增 有效性校验: - 字段: vin - 统计规则: 字符串长度 - 校验方法: 固定制 - 期望值> 0 唯一性校验 - 字段: order_id - 统计函数: 重复数 - 校验方法: 固定值 - 期望值: =0",
      "expected": "执行成功, 校验结果: 校验通过"
    },
    {
      "action": "调度属性: - 调度周期: 时 - 生效日期: T~T+1 - 间隔时间: 1小时 - 其它默认",
      "expected": ""
    },
    {
      "action": "选择任务rule01, 立即执行",
      "expected": ""
    },
    {
      "action": "进入「校验结果查询」, 检查规则任务详情页",
      "expected": ""
    },
    {
      "action": "编辑规则任务rule01, 分区: pt_date='20260201' / data_type='normal'其它配置不变, 保存后重新执行任务",
      "expected": ""
    }
  ]
} as const;

test.describe("验证规则任务配置规则包后校验正常(2规则包 * 2校验规则)", () => {
  test("C0019 验证规则任务配置规则包后校验正常(2规则包 * 2校验规则)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
