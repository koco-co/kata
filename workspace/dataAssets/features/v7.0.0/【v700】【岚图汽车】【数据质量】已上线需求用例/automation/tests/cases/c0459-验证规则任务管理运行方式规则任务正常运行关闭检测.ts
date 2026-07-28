// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0459",
  "title": "验证【规则任务管理❯ 运行方式】规则任务正常运行(关闭检测)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择已有分区: factory_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: T+1生成",
      "expected": "配置成功"
    },
    {
      "action": "选择规则任务rule01, 关闭检测, 等待T+1生成",
      "expected": "生成成功"
    },
    {
      "action": "进入【校验结果查询】, 检查实例详情页面",
      "expected": "校验结果: 校验通过"
    }
  ]
} as const;

test.describe("验证【规则任务管理❯ 运行方式】规则任务正常运行(关闭检测)", () => {
  test("C0459 验证【规则任务管理❯ 运行方式】规则任务正常运行(关闭检测)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
