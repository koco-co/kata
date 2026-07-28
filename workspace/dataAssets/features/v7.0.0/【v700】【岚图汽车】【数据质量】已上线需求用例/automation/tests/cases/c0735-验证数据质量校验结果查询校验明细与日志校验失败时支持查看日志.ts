// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0735",
  "title": "验证【数据质量 校验结果查询 校验明细与日志】校验失败时支持查看日志",
  "steps": [
    {
      "action": "进入【数据质量 → 校验结果查询】页面，等待页面加载完成",
      "expected": "校验结果查询页面正常打开，列表加载完成"
    },
    {
      "action": "找到「日志查看测试任务」执行状态为「校验失败」的最新实例记录，点击操作列的【查看日志】按钮，等待日志内容加载",
      "expected": "日志弹窗正常打开，显示本次任务执行的错误日志内容，日志内容包含数据源连接异常的错误描述信息，不显示空白页"
    }
  ]
} as const;

test.describe("验证【数据质量 校验结果查询 校验明细与日志】校验失败时支持查看日志", () => {
  test("C0735 验证【数据质量 校验结果查询 校验明细与日志】校验失败时支持查看日志", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
