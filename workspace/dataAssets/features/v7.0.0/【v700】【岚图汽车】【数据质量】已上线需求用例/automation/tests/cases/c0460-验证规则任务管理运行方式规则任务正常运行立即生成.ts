// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0460",
  "title": "验证【规则任务管理❯ 运行方式】规则任务正常运行(立即生成)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择已有分区: factory_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」",
      "expected": "配置成功"
    },
    {
      "action": "立即生成规则任务实例",
      "expected": "生成成功"
    },
    {
      "action": "进入【校验结果查询】, 检查实例详情页面",
      "expected": "校验结果: 校验不通过"
    },
    {
      "action": "进入【规则任务管理】, 编辑rule01, 修改分区: factory_date=20260115 , 点击数据预览",
      "expected": "数据预览成功: 3条数据"
    },
    {
      "action": "后面配置不变, 保存后再次立即生成任务",
      "expected": "生成成功"
    },
    {
      "action": "进入【校验结果查询】, 检查实例详情页面",
      "expected": "校验结果: 校验通过"
    }
  ]
} as const;

test.describe("验证【规则任务管理❯ 运行方式】规则任务正常运行(立即生成)", () => {
  test("C0460 验证【规则任务管理❯ 运行方式】规则任务正常运行(立即生成)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
