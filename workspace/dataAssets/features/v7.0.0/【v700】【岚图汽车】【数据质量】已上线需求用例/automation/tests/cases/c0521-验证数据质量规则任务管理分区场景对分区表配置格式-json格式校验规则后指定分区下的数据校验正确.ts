// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0521",
  "title": "验证【数据质量 规则任务管理 分区场景】对分区表配置格式-json格式校验规则后指定分区下的数据校验正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成",
      "expected": "规则任务列表正常加载"
    },
    {
      "action": "找到「分区校验测试任务」，点击【立即执行】按钮",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到「分区校验测试任务」最新实例记录并打开实例详情",
      "expected": "1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配\n2) 仅校验 dt='2026-04-01' 分区下的数据（id=1 和 id=2）\n3) id=1 记录质检结果=「校验通过」，id=2 记录质检结果=「校验不通过」\n4) dt='2026-04-02' 分区的数据（id=3、id=4）不参与本次校验"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 分区场景】对分区表配置格式-json格式校验规则后指定分区下的数据校验正确", () => {
  test("C0521 验证【数据质量 规则任务管理 分区场景】对分区表配置格式-json格式校验规则后指定分区下的数据校验正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
