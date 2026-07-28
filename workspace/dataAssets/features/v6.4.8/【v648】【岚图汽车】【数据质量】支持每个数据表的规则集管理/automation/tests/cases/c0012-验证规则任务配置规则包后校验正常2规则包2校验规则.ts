// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0012",
  "title": "验证规则任务配置规则包后校验正常(2规则包 * 2校验规则)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_sales_time_quality- 选择分区: pt_date='20260204' / data_type='abnormal_monotonicity'2) 监控规则: 引入规则包1(一致性校验、合理性校验)、规则包2(时效性校验)一致性校验: - 校验类型: 多表数据一致性对比- 校验字段: /- 校验表主键: order_id- 对比表1: dwd_voyah_sales_time_quality02- 输入分区: pt_date=20260203/data_type='normal'- 对比表主键: order_id合理性校验:- 字段: order_id- 统计函数: 数据变化趋势- 过滤条件: /- 排序字段: order_id- 校验方法: 单调递增时效性校验- 字段: order_id- 统计函数: 周期性校验（单字段时间差校验）- 过滤条件: /- 排序字段: order_id- 时间差: <= 1 秒时效性校验- 字段: order_id- 统计函数: 及时性校验（多字段时间差校验）- 对比字段组1: order_time, payment_time- 时间差: <= 1 秒- 大小关系: order_time < payment_time3) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认",
      "expected": "配置成功"
    },
    {
      "action": "选择任务rule01, 立即执行",
      "expected": "执行成功, 校验结果: 校验不通过"
    },
    {
      "action": "进入「校验结果查询」, 检查规则任务详情页",
      "expected": "显示表数据中未通过的数据"
    },
    {
      "action": "SQL验证:WITH iqr_stats AS (    -- 计算 guide_price 的四分位数和 IQR 阈值    SELECT         percentile_approx(guide_price, 0.25) as q1,        percentile_approx(guide_price, 0.75) as q3,        (percentile_approx(guide_price, 0.75) - percentile_approx(guide_price, 0.25)) * 1.5 as iqr_range    FROM dwd_voyah_vehicle_sales_dates),duplicate_orders AS (    -- 识别 order_id 重复的数据    SELECT order_id    FROM dwd_voyah_vehicle_sales_dates    GROUP BY order_id    HAVING COUNT(1) > 1)SELECT     t.*,    CASE         WHEN t.final_price < 0 OR t.final_price IS NULL THEN '完整性校验异常:成交价<0或为空'        WHEN length(trim(t.vin)) = 0 OR t.vin IS NULL THEN '有效性校验异常:VIN长度<=0'        WHEN d.order_id IS NOT NULL THEN '唯一性校验异常:订单号重复'        WHEN t.guide_price < (i.q1 - i.iqr_range) OR t.guide_price > (i.q3 + i.iqr_range) THEN '统计性校验异常:指导价IQR离群'        ELSE NULL     END AS error_reasonFROM     dwd_voyah_vehicle_sales_dates tCROSS JOIN iqr_stats iLEFT JOIN duplicate_orders d ON t.order_id = d.order_idWHERE     -- 1. 完整性校验: final_price < 0 或 NULL    (t.final_price < 0 OR t.final_price IS NULL)        -- 2. 有效性校验: vin 长度 <= 0 (含纯空格或NULL)    OR (length(trim(t.vin)) = 0 OR t.vin IS NULL)        -- 3. 唯一性校验: order_id 重复    OR (d.order_id IS NOT NULL)        -- 4. 统计性校验: guide_price 为 IQR 离群点    OR (t.guide_price < (i.q1 - i.iqr_range) OR t.guide_price > (i.q3 + i.iqr_range));",
      "expected": "返回的数据与规则过滤出的数据一致"
    },
    {
      "action": "编辑规则任务rule01, 分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务",
      "expected": "执行成功, 校验结果: 校验通过"
    }
  ]
} as const;

test.describe("验证规则任务配置规则包后校验正常(2规则包 * 2校验规则)", () => {
  test("C0012 验证规则任务配置规则包后校验正常(2规则包 * 2校验规则)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
