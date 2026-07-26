// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C003",
  "title": "验证规则任务配置规则包后校验正常(20规则包 * 1校验规则)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
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
      "action": "SQL验证:SELECT     *FROM (    SELECT         *,        -- [辅助计算] 针对规则 17,19,20: 计算 order_id 重复数        COUNT(1) OVER(PARTITION BY order_id) as calc_order_dup_count,        -- [辅助计算] 针对规则 18: 计算 vin 重复数        COUNT(1) OVER(PARTITION BY vin) as calc_vin_dup_count    FROM         dwd_voyah_vehicle_sales_dates) tWHERE     -- =========================================================    -- A. 完整性校验 (规则 1-10: 这里的逻辑是“找出为空或NULL的数据“)    -- =========================================================    -- 规则1: vin 空串    (trim(vin) = '') OR    -- 规则2-10: 各关键字段判空    (vin IS NULL) OR    (order_id IS NULL) OR    (car_model IS NULL) OR    (guide_price IS NULL) OR    (final_price IS NULL) OR    (dealer_name IS NULL) OR    (order_status IS NULL) OR    (factory_date IS NULL) OR    (sale_date IS NULL)    -- =========================================================    -- B. 取值范围与有效性 (规则 11, 14, 15, 16)    -- =========================================================    OR     -- 规则11: final_price < 0    (final_price < 0)        OR    -- 规则14: vin 长度 <= 0 (注: 空串/NULL已被上面捕获，此处兜底)    (length(vin) <= 0)    OR    -- 规则15: guide_price 超出 [0, 1000000] 范围    (guide_price < 0 OR guide_price > 1000000)    OR    -- 规则16: car_model 枚举校验 (假设标准值为3个: FREE, 梦想家, 追光)    -- 如果当前值不在这3个里面，且不是NULL，则视为脏数据    (car_model IS NOT NULL AND car_model NOT IN ('岚图FREE', '岚图梦想家', '岚图追光'))    -- =========================================================    -- C. 唯一性与重复性 (规则 17, 18, 19, 20)    -- =========================================================    OR    -- 规则17,19,20: order_id 出现重复 (统计数 > 1)    (calc_order_dup_count > 1)    OR    -- 规则18: vin 出现重复 (统计数 > 1)    (calc_vin_dup_count > 1);",
      "expected": "返回的数据与规则过滤出的数据一致"
    },
    {
      "action": "编辑规则任务rule01, 变更分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务",
      "expected": "执行成功, 校验结果: 校验通过"
    }
  ]
} as const;

test.describe("验证规则任务配置规则包后校验正常(20规则包 * 1校验规则)", () => {
  test("C003 验证规则任务配置规则包后校验正常(20规则包 * 1校验规则)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
