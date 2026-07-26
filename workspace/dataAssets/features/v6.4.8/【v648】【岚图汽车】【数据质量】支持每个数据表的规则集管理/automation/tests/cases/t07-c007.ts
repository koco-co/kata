// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C007",
  "title": "验证规则任务配置规则包后校验正常(1规则包 * 1校验规则)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择分区: /2) 监控规则: 引入规则包、规则类型(完整性校验)完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」",
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
      "action": "SQL验证:SELECT * FROM dwd_voyah_vehicle_sales_dates WHERE final_price < 0 OR final_price IS NULL;",
      "expected": "返回的数据与规则过滤出的数据一致"
    },
    {
      "action": "编辑规则任务rule01, 分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务",
      "expected": "执行成功, 校验结果: 校验通过"
    }
  ]
} as const;

test.describe("验证规则任务配置规则包后校验正常(1规则包 * 1校验规则)", () => {
  test("C007 验证规则任务配置规则包后校验正常(1规则包 * 1校验规则)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
