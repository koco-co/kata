// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C355",
  "title": "验证【数据质量报告-已生成报告】报告状态筛选与状态展示正常",
  "steps": [
    {
      "action": "准备已生成报告状态数据:\n1）「供应商主数据待生成日报」/ 报告状态「待生成」\n2）「供应商主数据生成中日报」/ 报告状态「生成中」\n3）「供应商主数据有效性周报」/ 报告状态「已生成」\n4）「车辆质量失败报告」/ 报告状态「生成失败」\n5）「车辆质量持续生成报告」/ 报告状态「持续生成中」",
      "expected": "1)五种报告状态均存在至少一条记录\n2)生成失败记录可打开「失败详情」"
    },
    {
      "action": "进入【数据质量 → 数据质量报告】并切换到「已生成报告」页签",
      "expected": "1)列表展示「报告状态」列\n2)报告状态筛选项包含「待生成」「生成中」「已生成」「生成失败」「持续生成中」"
    },
    {
      "action": "分别按「待生成」「生成中」「已生成」「生成失败」「持续生成中」筛选",
      "expected": "1)每次筛选后列表仅展示对应状态报告\n2)状态文案与筛选条件一致\n3)切换筛选条件后列表刷新正确"
    },
    {
      "action": "对「生成失败」报告点击「失败详情」",
      "expected": "1)失败详情弹窗打开\n2)展示失败原因或失败日志摘要\n3)关闭弹窗后仍停留在已生成报告列表"
    }
  ]
} as const;

test.describe("验证【数据质量报告-已生成报告】报告状态筛选与状态展示正常", () => {
  test("C355 验证【数据质量报告-已生成报告】报告状态筛选与状态展示正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
