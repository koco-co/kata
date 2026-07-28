// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0038",
  "title": "验证【联动】质量和离线绑定，单规则包-【表行数-强规则-校验不通过】结果正确",
  "steps": [
    {
      "action": "编辑质量规则，表行数阈值设置为\"固定值 > 3\"，规则级别设为\"强规则\"，保存",
      "expected": "规则保存成功；规则列表显示该规则类型为\"表行数\"、强规则标记可见"
    },
    {
      "action": "触发离线同步任务（doris1→doris2）运行，同时观察质量任务状态",
      "expected": "质量任务列表新增一条实例，状态显示\"运行中\""
    },
    {
      "action": "等待质量实例和离线实例均运行结束，查看各自结果",
      "expected": "1）质量实例状态\"运行成功\"，校验结果\"校验不通过\"；点击【查看明细】展示 doris1 中的 3 条数据（实际行数=3，不满足 > 3 条件）\n2）离线实例状态\"运行失败\"，失败原因包含\"上游质量任务失败\"文字"
    },
    {
      "action": "进入【离线开发-运维中心-周期任务】，找到 doris2doris 任务，点击【补数据】，选择当前日期及下游，提交并等待完成",
      "expected": "1）补数据工作流中包含 1 个规则包，离线任务运行失败，失败日志/原因包含\"质量任务校验不通过\"\n2）质量任务新生成一条实例，校验结果显示\"校验不通过\""
    }
  ]
} as const;

test.describe("验证【联动】质量和离线绑定，单规则包-【表行数-强规则-校验不通过】结果正确", () => {
  test("C0038 验证【联动】质量和离线绑定，单规则包-【表行数-强规则-校验不通过】结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
