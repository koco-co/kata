// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C721",
  "title": "验证【校验结果查询 ❯ Doris3.x ❯】编辑规则集后, 对已配置过历史规则的任务不生效",
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
      "action": "新建监控规则, 配置监控对象(dwd_voyah_vehicle_sales_dates)后点击下一步",
      "expected": "进入【新建单表校验规则 ❯ 监控规则】配置页面"
    },
    {
      "action": "引入规则包rule01中所有校验规则",
      "expected": "引入成功, 配置参数正确"
    },
    {
      "action": "保存规则任务task01后, 立即执行",
      "expected": "任务运行成功, 校验结果: 校验不通过"
    },
    {
      "action": "修改【规则集-规则包rule01】中的校验规则:- 期望值: >= -200",
      "expected": "配置成功"
    },
    {
      "action": "新建规则任务task02并立即执行:1) 监控对象: t2 (与dwd_voyah_vehicle_sales_dates同表结构同数据)2) 监控规则: rule01中的校验规则",
      "expected": "任务运行成功, 校验结果: 校验通过"
    },
    {
      "action": "重新运行历史规则任务task01, 在【校验结果查询】中查看运行状态",
      "expected": "任务运行成功, 校验结果: 校验不通过"
    }
  ]
} as const;

test.describe("验证【校验结果查询 ❯ Doris3.x ❯】编辑规则集后, 对已配置过历史规则的任务不生效", () => {
  test("C721 验证【校验结果查询 ❯ Doris3.x ❯】编辑规则集后, 对已配置过历史规则的任务不生效", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
