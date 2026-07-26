// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1021",
  "title": "验证【数据质量 数据质量报告 质量报告-展示】 验证质量报告中不包含校验方法的详情说明格式正确",
  "steps": [
    {
      "action": "进入【数据质量 → 数据质量报告】页面，等待页面加载完成",
      "expected": "数据质量报告页面正常打开，报告列表加载完成"
    },
    {
      "action": "找到\"task_json_not_include_test\"，查看最新一次执行的报告详情",
      "expected": "报告详情页正常打开，数据加载完成"
    },
    {
      "action": "分别查看校验通过行和校验不通过行的\"详情说明\"列内容",
      "expected": "1) 校验通过行：详情说明=符合规则key范围不包含\"key1-key2\"\n2) 校验不通过行：详情说明=不符合规则key范围不包含\"key1-key2\"\n3) 两者格式均正确体现\"不包含\"校验方法"
    }
  ]
} as const;

test.describe("验证【数据质量 数据质量报告 质量报告-展示】 验证质量报告中不包含校验方法的详情说明格式正确", () => {
  test("C1021 验证【数据质量 数据质量报告 质量报告-展示】 验证质量报告中不包含校验方法的详情说明格式正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
