// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C039",
  "title": "验证「设置默认监控数据源库」后，删除数据源库逻辑正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「设置默认监控数据源库」按钮，配置「默认监控数据源」「默认监控数据库」",
      "expected": "配置成功"
    },
    {
      "action": "新建「质量校验规则」A",
      "expected": "自动引入默认配置的源库"
    },
    {
      "action": "配置规则，保存",
      "expected": "规则配置完成"
    },
    {
      "action": "立即运行规则任务A",
      "expected": "运行结果正确"
    },
    {
      "action": "已配置的数据源，【平台管理】取消授权当前项目",
      "expected": "操作正常"
    },
    {
      "action": "点击「设置默认监控数据源库」",
      "expected": "展示为空"
    },
    {
      "action": "重新运行规则任务A",
      "expected": "任务运行失败"
    },
    {
      "action": "重新「新建规则校验」任务",
      "expected": "不自动引入原先设置的默认源库"
    }
  ]
} as const;

test.describe("验证「设置默认监控数据源库」后，删除数据源库逻辑正确", () => {
  test("C039 验证「设置默认监控数据源库」后，删除数据源库逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
