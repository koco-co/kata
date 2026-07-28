// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0126",
  "title": "验证不同告警通道-接收人均支持多选",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "进入成功"
    },
    {
      "action": "配置「数据源」「数据库」「数据表」，选择【完整性校验】规则",
      "expected": "选择成功，展示【完整性校验】规则配置项"
    },
    {
      "action": "【完整性校验】规则均配置",
      "expected": "配置完成"
    },
    {
      "action": "点击「保存」按钮",
      "expected": "规则配置保存正确"
    },
    {
      "action": "点击「下一步」，配置「调度属性」-「告警配置」\n选择「短信」通道，选择用户A、B、C",
      "expected": "短信通道选择用户A、B、C成功，支持多选"
    },
    {
      "action": "点击「下一步」，配置「调度属性」-「告警配置」\n选择「邮箱」通道，选择用户A、B、C",
      "expected": "邮箱通道选择用户A、B、C成功，支持多选"
    },
    {
      "action": "点击「下一步」，配置「调度属性」-「告警配置」\n选择「钉钉」通道，选择用户A、B、C",
      "expected": "钉钉通道选择用户A、B、C成功，支持多选"
    },
    {
      "action": "点击「下一步」，配置「调度属性」-「告警配置」\n选择「自定义」通道，选择用户A、B、C",
      "expected": "自定义通道选择用户A、B、C成功，支持多选"
    },
    {
      "action": "不同通道均选择10个用户",
      "expected": "最大可选用户数校验正确"
    },
    {
      "action": "点击「完成」按钮",
      "expected": "规则保存成功"
    }
  ]
} as const;

test.describe("验证不同告警通道-接收人均支持多选", () => {
  test("C0126 验证不同告警通道-接收人均支持多选", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
