// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0730",
  "title": "验证【校验结果查询 ❯ SparkThrift2.x ❯】规则任务管理规则包后校验正常(1规则包 * 10校验规则)",
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
      "action": "SQL验证:SELECT _FROM ( SELECT_, -- [辅助计算] 唯一性校验: 计算 order_id 的重复次数 COUNT(1) OVER(PARTITION BY order_id) as order_dup_count FROM dwd_voyah_vehicle_sales_dates) tWHERE -- --------------------------------------------------------- -- 1. 完整性校验 (字段级) -- --------------------------------------------------------- -- 规则: vin 空串数=0 (即: 找出 vin 为空串的数据) (trim(vin) = '') OR -- 规则: car_model 空值数=0 (即: 找出 car_model 为 NULL 的数据) (car_model IS NULL) OR -- 规则: final_price 期望值 >= 0 (即: 找出 < 0 的数据) (final_price < 0) -- --------------------------------------------------------- -- 2. 有效性校验 -- --------------------------------------------------------- -- 规则: vin 字符串长度 > 0 (即: 找出长度 <= 0 或 NULL 的数据) -- 注: 此规则与上面的\"空串数\"、\"空值数\"有重叠，此处做兜底 OR (length(vin) <= 0 OR vin IS NULL) -- 规则: guide_price 取值范围 [0, 1000000] (即: 找出在此范围之外的数据) OR (guide_price < 0 OR guide_price > 1000000) -- 规则: car_model 枚举个数 = 3 (即: 找出不属于这3个标准车型的数据) -- 假设标准枚举值为: 岚图FREE, 岚图梦想家, 岚图追光 -- 注: NULL值已被前面的完整性校验捕获，此处主要校验\"未知枚举值\" OR (car_model IS NOT NULL AND car_model NOT IN ('岚图FREE', '岚图梦想家', '岚图追光')) -- --------------------------------------------------------- -- 3. 唯一性校验 -- --------------------------------------------------------- -- 规则: order_id 重复数/重复率期望为0 (即: 找出重复出现的订单) OR (order_dup_count > 1);",
      "expected": "返回的数据与规则过滤出的数据一致"
    },
    {
      "action": "编辑规则任务rule01, 分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务",
      "expected": "执行成功, 校验结果: 校验通过"
    }
  ]
} as const;

test.describe("验证【校验结果查询 ❯ SparkThrift2.x ❯】规则任务管理规则包后校验正常(1规则包 * 10校验规则)", () => {
  test("C0730 验证【校验结果查询 ❯ SparkThrift2.x ❯】规则任务管理规则包后校验正常(1规则包 * 10校验规则)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
