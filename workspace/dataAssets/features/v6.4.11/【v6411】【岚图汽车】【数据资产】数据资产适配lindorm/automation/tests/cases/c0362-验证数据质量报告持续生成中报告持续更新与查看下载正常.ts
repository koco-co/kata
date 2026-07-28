// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0362",
  "title": "验证【数据质量报告】持续生成中报告持续更新与查看下载正常",
  "steps": [
    {
      "action": "准备持续生成报告「车辆质量持续生成报告」:\n- 关联数据表: ${SchemaA}.dwd_vehicle_quality_di\n- 报告周期: 天\n- 报告状态: 持续生成中\n- 已完成至少一个任务实例，仍有一个规则任务生成中",
      "expected": "1)已生成报告列表存在「车辆质量持续生成报告」\n2)报告状态为「持续生成中」\n3)操作列在可查看阶段展示「报告详情」或生成完成后展示「下载」"
    },
    {
      "action": "进入【数据质量 → 数据质量报告 → 已生成报告】，查询「车辆质量持续生成报告」",
      "expected": "1)列表展示目标报告\n2)报告状态为「持续生成中」\n3)生成时间随报告生成过程更新"
    },
    {
      "action": "等待关联任务执行完成并刷新列表",
      "expected": "1)报告状态由「持续生成中」更新为「已生成」或失败时更新为「生成失败」\n2)已生成时操作列展示「报告详情」「下载」\n3)生成失败时可查看「失败详情」"
    },
    {
      "action": "报告状态为「已生成」后点击「报告详情」并点击「下载」",
      "expected": "1)报告详情可正常打开\n2)下载文件生成成功\n3)报告内容包含持续生成期间完成的任务实例结果"
    }
  ]
} as const;

test.describe("验证【数据质量报告】持续生成中报告持续更新与查看下载正常", () => {
  test("C0362 验证【数据质量报告】持续生成中报告持续更新与查看下载正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
