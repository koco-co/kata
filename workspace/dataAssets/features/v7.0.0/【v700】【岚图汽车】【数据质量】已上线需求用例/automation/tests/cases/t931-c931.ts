// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C931",
  "title": "验证「报告详情」-查看日志功能正常",
  "steps": [
    {
      "action": "进入离线开发-周期任务, 创建并执行Hive SQL任务: DROP TABLE car_compare02;",
      "expected": "源表删除成功, 但是元数据表仍存在于资产平台"
    },
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "成功进入「已配置报告」页面"
    },
    {
      "action": "在「已配置报告」中新建报告, 规则范围默认「全部」,报告周期为「一次性」, 并配置car_compare02表, 点击「确定」",
      "expected": "1) 表单提交成功\n2) 质量报告校验失败"
    },
    {
      "action": "点击「已生成报告」页签, 进入报告详情, 点击操作中的「查看日志」",
      "expected": "支持查看日志数据，和任务实例模块的查看日志内容保持一致"
    }
  ]
} as const;

test.describe("验证「报告详情」-查看日志功能正常", () => {
  test("C931 验证「报告详情」-查看日志功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
