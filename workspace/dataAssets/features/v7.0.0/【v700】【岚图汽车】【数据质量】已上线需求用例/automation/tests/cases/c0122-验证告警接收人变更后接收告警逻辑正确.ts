// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0122",
  "title": "验证告警接收人变更后，接收告警逻辑正确",
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
      "action": "「校验类型」选择「单表」\n「规则类型」选择「表级」\n「统计函数」 选择「表行数」\n「过滤条件」 输入「id < 100」\n「校验方法」选择「固定值」\n「期望值」选择「<0」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」",
      "expected": "配置完成"
    },
    {
      "action": "点击「保存」按钮",
      "expected": "规则配置保存正确"
    },
    {
      "action": "点击「下一步」，配置「周期任务」\n「告警配置」配置如下：\n勾选「短信」「邮箱」「钉钉」告警通道\n所有通道均选择用户A、B、C、D",
      "expected": "周期调度、告警配置完成"
    },
    {
      "action": "点击「完成」按钮",
      "expected": "规则保存成功"
    },
    {
      "action": "立即运行、周期运行",
      "expected": "实例运行失败，用户A、B、C、D均接收到四个通道的告警信息"
    },
    {
      "action": "编辑「校验规则」-「调度配置」-「告警配置」\n「短信」仅选择A用户\n「邮箱」仅选择B用户\n「钉钉」仅选择C用户\n「自定义」仅选择D用户",
      "expected": "配置更新完成"
    },
    {
      "action": "保存规则",
      "expected": "规则详情查看告警配置字段，各通道告警接收人更新正确"
    },
    {
      "action": "立即运行、周期运行",
      "expected": "A用户仅收到「短信」告警\nB用户仅收到「邮箱」告警\nC用户仅收到「钉钉告警」\nD用户仅收到「自定义」告警"
    }
  ]
} as const;

test.describe("验证告警接收人变更后，接收告警逻辑正确", () => {
  test("C0122 验证告警接收人变更后，接收告警逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
