// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0526",
  "title": "验证【数据质量 规则任务管理 数据源兼容性】「格式-json格式校验」规则在Hive 2.x数据源下执行正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成",
      "expected": "规则任务管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到「Hive2兼容性测试任务」，点击【立即执行】按钮",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到「Hive2兼容性测试任务」最新实例记录并打开实例详情",
      "expected": "1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配\n2) 实例状态显示「已完成」，最新校验结果显示「校验不通过」\n3) 实例详情中 id=1 记录质检结果=「校验通过」，id=2 记录因 score.value 值为「1000」而质检结果=「校验不通过」"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 数据源兼容性】「格式-json格式校验」规则在Hive 2.x数据源下执行正确", () => {
  test("C0526 验证【数据质量 规则任务管理 数据源兼容性】「格式-json格式校验」规则在Hive 2.x数据源下执行正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
