// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C522",
  "title": "验证【数据质量 规则任务管理 抽样场景】配置格式-json格式校验规则时结合抽样功能执行校验结果正确",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成",
      "expected": "规则任务列表正常加载"
    },
    {
      "action": "找到「抽样校验测试任务」，点击【立即执行】按钮",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到「抽样校验测试任务」最新实例记录并打开实例详情",
      "expected": "1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配\n2) 实例详情中的统计信息显示参与校验的数据量约为总数据量的 50%（约10条）\n3) 「格式-json格式校验」规则行的质检结果正常显示本次抽样后的实际校验结果（id=11、id=12 的无效数据被抽中时结果为「校验不通过」，否则为「校验通过」）\n4) 详情说明列准确显示校验key为「sample-code」时的 value 格式要求"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 抽样场景】配置格式-json格式校验规则时结合抽样功能执行校验结果正确", () => {
  test("C522 验证【数据质量 规则任务管理 抽样场景】配置格式-json格式校验规则时结合抽样功能执行校验结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
