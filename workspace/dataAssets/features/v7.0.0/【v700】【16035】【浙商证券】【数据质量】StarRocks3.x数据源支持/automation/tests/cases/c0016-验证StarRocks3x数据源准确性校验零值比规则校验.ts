// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0016",
  "title": "验证 StarRocks 3.x 数据源准确性校验零值比规则校验",
  "steps": [
    {
      "action": "进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:\n- 规则名称: 成交量零值比校验\n- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）\n- 选择数据表: zszq_trade_zero\n点击「下一步」",
      "expected": "三级联动正常"
    },
    {
      "action": "点击「添加规则」-「准确性校验」，配置规则:\n- 字段: trade_volume\n- 统计函数: 零值比\n- 校验方法: 固定值\n- 期望值: = 0%\n- 强弱规则: 弱规则\n- 规则描述: 成交量零值比校验\n点击「保存」",
      "expected": "规则保存成功"
    },
    {
      "action": "点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例",
      "expected": "实例状态由「运行中」→「校验异常」（零值比 20% 不满足 = 0%）"
    },
    {
      "action": "对「校验异常」实例「查看明细」",
      "expected": "明细展示零值记录 order_id=1003"
    },
    {
      "action": "编辑规则:\n- 期望值: <= 20%\n保存后再次「立即执行」，在【任务查询】查看最新实例",
      "expected": "实例状态由「运行中」→「校验通过」（零值比 20% 满足 <= 20%）"
    }
  ]
} as const;

test.describe("验证 StarRocks 3.x 数据源准确性校验零值比规则校验", () => {
  test("C0016 验证 StarRocks 3.x 数据源准确性校验零值比规则校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
