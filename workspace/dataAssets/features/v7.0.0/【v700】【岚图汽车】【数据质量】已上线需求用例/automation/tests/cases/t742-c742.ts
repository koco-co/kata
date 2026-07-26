// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C742",
  "title": "验证【数据质量 校验结果查询 校验明细与日志】校验通过时结果查询页不显示明细入口",
  "steps": [
    {
      "action": "进入【数据质量 → 校验结果查询】页面，等待页面加载完成",
      "expected": "校验结果查询页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"task_json_key_range_test\"最新执行记录",
      "expected": "执行记录正常展示，可定位到目标记录"
    },
    {
      "action": "找到质检结果为\"校验通过\"的规则行，查看操作列",
      "expected": "质检结果为\"校验通过\"的规则行，操作列显示\"--\"，不显示【查看明细】按钮，无法进入明细页"
    }
  ]
} as const;

test.describe("验证【数据质量 校验结果查询 校验明细与日志】校验通过时结果查询页不显示明细入口", () => {
  test("C742 验证【数据质量 校验结果查询 校验明细与日志】校验通过时结果查询页不显示明细入口", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
