// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0525",
  "title": "验证【数据质量 规则任务管理 大数据量场景】json格式配置中维护上千个key时执行校验与结果展示正常",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成",
      "expected": "规则任务管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到「大数据量key校验任务」，点击【立即执行】按钮",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到「大数据量key校验任务」最新实例记录并打开实例详情",
      "expected": "1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配\n2) 实例详情可正常打开，不出现超时、空白或报错\n3) 实例详情中 id=1 记录质检结果=「校验通过」，id=2 记录因 perf-key-0001 值为空而质检结果=「校验不通过」\n4) 详情说明列准确引用校验key「perf-key-0001;perf-key-0002」"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 大数据量场景】json格式配置中维护上千个key时执行校验与结果展示正常", () => {
  test("C0525 验证【数据质量 规则任务管理 大数据量场景】json格式配置中维护上千个key时执行校验与结果展示正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
