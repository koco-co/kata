// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0108",
  "title": "验证「完整性校验」-「字段级」-「字段间规则逻辑- or」-「全部成功」功能校验",
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
      "action": "「规则类型」选择「字段级」\n「字段」选择「id,age,score,class」\n「字段间规则逻辑」选择「or」\n「统计函数」选择「字段值校验」",
      "expected": "选择成功"
    },
    {
      "action": "「期望值」 配置如下：\n「id字段」 !=0\n「age字段」 in [7,8]\n「score」 <= 100\n「class」 包含 \"一年级\"\n「过滤条件」 选择 id<100",
      "expected": "配置完成"
    },
    {
      "action": "保存任务，并立即运行任务",
      "expected": "校验通过"
    }
  ]
} as const;

test.describe("验证「完整性校验」-「字段级」-「字段间规则逻辑- or」-「全部成功」功能校验", () => {
  test("C0108 验证「完整性校验」-「字段级」-「字段间规则逻辑- or」-「全部成功」功能校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
