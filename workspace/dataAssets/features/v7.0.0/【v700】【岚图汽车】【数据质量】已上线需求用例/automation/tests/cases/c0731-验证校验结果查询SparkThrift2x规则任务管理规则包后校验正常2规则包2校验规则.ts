// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0731",
  "title": "验证【校验结果查询 ❯ SparkThrift2.x ❯】规则任务管理规则包后校验正常(2规则包 * 2校验规则)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "新建监控规则, 配置如下:\n1) 监控对象:\n- 规则名称: rule01\n- 数据表: dwd_voyah_sales_time_quality\n- 选择分区: pt_date='20260204' / data_type='abnormal_monotonicity'\n2) 监控规则: 引入规则包1(完整性校验、合理性校验)、规则包2(时效性校验)\n完整性校验:\n- 生效范围: 字段级\n- 字段: order_id\n- 统计函数: 字段取值校验\n- 期望值: >= 0\n合理性校验:\n- 字段: order_id\n- 统计函数: 数据变化趋势\n- 过滤条件: /\n- 排序字段: order_id\n- 校验方法: 单调递增\n有效性校验:\n- 字段: vin\n- 统计规则: 字符串长度\n- 校验方法: 固定制\n- 期望值> 0\n唯一性校验\n- 字段: order_id\n- 统计函数: 重复数\n- 校验方法: 固定值\n- 期望值: =0\n3) 调度属性:\n- 调度周期: 时\n- 生效日期: T~T+1\n- 间隔时间: 1小时\n- 其它默认",
      "expected": "3. 执行成功, 校验结果: 校验不通过"
    },
    {
      "action": "选择任务rule01, 立即执行",
      "expected": "显示表数据中未通过的数据"
    },
    {
      "action": "进入「校验结果查询」, 检查规则任务详情页",
      "expected": "执行成功, 校验结果: 校验通过"
    },
    {
      "action": "编辑规则任务rule01, 分区: pt_date='20260201' / data_type='normal'其它配置不变, 保存后重新执行任务",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【校验结果查询 ❯ SparkThrift2.x ❯】规则任务管理规则包后校验正常(2规则包 * 2校验规则)", () => {
  test("C0731 验证【校验结果查询 ❯ SparkThrift2.x ❯】规则任务管理规则包后校验正常(2规则包 * 2校验规则)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
