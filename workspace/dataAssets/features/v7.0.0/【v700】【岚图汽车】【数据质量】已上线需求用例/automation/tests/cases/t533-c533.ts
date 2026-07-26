// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C533",
  "title": "验证【数据质量 规则任务管理 校验失败查看日志】取值范围&枚举范围规则执行失败时可查看日志",
  "steps": [
    {
      "action": "进入【数据质量 → 校验结果查询】页面，等待列表加载完成",
      "expected": "校验结果查询页面打开，列表显示已有任务记录"
    },
    {
      "action": "在校验结果查询列表中找到状态为【执行失败】且包含取值范围&枚举范围规则的实例记录，打开实例详情后点击对应规则行操作列【查看日志】链接",
      "expected": "日志弹窗正常打开，显示任务执行失败的详细日志信息，包含失败时间戳、错误类型及错误详情"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 校验失败查看日志】取值范围&枚举范围规则执行失败时可查看日志", () => {
  test("C533 验证【数据质量 规则任务管理 校验失败查看日志】取值范围&枚举范围规则执行失败时可查看日志", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
