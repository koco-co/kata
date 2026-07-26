// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1235",
  "title": "验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」流程运转",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【落标检查】页面",
      "expected": "进入成功"
    },
    {
      "action": "定位到测试用任务 【test】，点击 [编辑] 按钮",
      "expected": "进入 [检查范围] 配置页面"
    },
    {
      "action": "[检查范围] 配置如下：\n「选择数据源」选择「${DATASOURCE}」\n「选择数据库」选择「${DATABASE}」\n「选择数据表」选择「${TABLE}」\n[选择分区] 选择 [选择已有分区]\n[标准目录] 选择 [test_rule]",
      "expected": "[检查范围] 配置完成"
    },
    {
      "action": "点击 [下一步] 按钮",
      "expected": "进入 [选择字段] 配置页面"
    },
    {
      "action": "[检查范围] 配置如下：\n[检查字段列表] 勾选部分字段，是否开启检查为开启，检查项为全部\n[规则包数量] 选择 [1]",
      "expected": "[选择字段] 配置完成"
    },
    {
      "action": "点击 [下一步] 按钮",
      "expected": "进入 [调度配置] 配置页面"
    },
    {
      "action": "[检查范围] 配置如下：\n[调度周期] 天\n[生效日期] 默认\n[具体时间] 默认\n[告警通知] 钉钉",
      "expected": "[调度配置] 配置完成"
    },
    {
      "action": "点击 [新增并立即执行] 按钮",
      "expected": "提示新增成功，返回【资产】-【数据标准】-【标准管理】-【落标检查】页面"
    },
    {
      "action": "检查【标准管理】-【落标检查】-【落标检查设置】/【落标检查结果】页面",
      "expected": "按设定新增了对应落标检查，并执行了一次落标检查生成了对应落标检查结果"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」流程运转", () => {
  test("C1235 验证【「数据标准」-「标准管理」新增「落标检查」版块】「标准管理」-「落标检查」-「落标检查任务」-「编辑检查任务」流程运转", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
