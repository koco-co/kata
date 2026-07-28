// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0440",
  "title": "验证【规则任务管理❯ 二级分区 ❯ 二级分区】分区信息改变, 任务实例信息改变(选择动态分区 ❯ 手动输入分区)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "新建监控规则, 配置如下:1)监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择动态分区: factory_date/sale_date = bdp.system.bizdate2) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」",
      "expected": "配置成功"
    },
    {
      "action": "运行规则任务rule01, 立即执行",
      "expected": "运行成功"
    },
    {
      "action": "进入【校验结果查询】, 检查实例详情页面",
      "expected": "校验结果: 校验不通过"
    },
    {
      "action": "进入【规则任务管理】, 编辑rule01, 修改分区: 手动输入分区: factory_date=20260115/sale_date=20260201 , 点击数据预览",
      "expected": "数据预览成功: 3条数据"
    },
    {
      "action": "后面配置不变, 保存后再次运行任务",
      "expected": "1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功"
    },
    {
      "action": "进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页",
      "expected": "实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】"
    },
    {
      "action": "检查后续生成的rule01实例的详情页",
      "expected": "分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过"
    }
  ]
} as const;

test.describe("验证【规则任务管理❯ 二级分区 ❯ 二级分区】分区信息改变, 任务实例信息改变(选择动态分区 ❯ 手动输入分区)", () => {
  test("C0440 验证【规则任务管理❯ 二级分区 ❯ 二级分区】分区信息改变, 任务实例信息改变(选择动态分区 ❯ 手动输入分区)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
