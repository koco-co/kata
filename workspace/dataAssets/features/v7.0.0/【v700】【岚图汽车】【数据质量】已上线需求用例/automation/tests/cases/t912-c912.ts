// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C912",
  "title": "验证「脏数据管理」中 Doris 3.x 数据源处理脏数据功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【脏数据管理】页面",
      "expected": "1) 进入成功2) 授权的质量项目的数据源默认开启脏数据存储"
    },
    {
      "action": "点击「编辑」按钮, 「数据存储时效」改为1天后确定",
      "expected": "修改成功"
    },
    {
      "action": "进入「规则任务管理」页面, 点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "进入成功"
    },
    {
      "action": "配置「数据源」「数据库」「数据表」等信息，选择【完整性校验】规则",
      "expected": "选择成功，展示【完整性校验】规则配置项"
    },
    {
      "action": "「校验类型」选择「字段级」「字段」选择「vin」「统计函数」 选择「空值数」「期望值」选择「=0」「过滤条件」 无「强弱规则」选择「弱规则」「规则描述」输入「测试规则」",
      "expected": "配置完成"
    },
    {
      "action": "保存后, 配置周期调度后完成新建监控规则",
      "expected": "规则添加成功"
    },
    {
      "action": "立即执行",
      "expected": "1) 执行成功, 任务实例的状态由运行中 > 校验失败2) 脏数据表生成，且表数据正确"
    },
    {
      "action": "第二天查看该脏数据表",
      "expected": "该脏数据表被删除"
    }
  ]
} as const;

test.describe("验证「脏数据管理」中 Doris 3.x 数据源处理脏数据功能正常", () => {
  test("C912 验证「脏数据管理」中 Doris 3.x 数据源处理脏数据功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
