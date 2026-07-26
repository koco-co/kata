// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C105",
  "title": "验证【「完整性校验」-「字段级-字段值校验」-「选择十个字段」校验结果】",
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
      "action": "「规则类型」选择「字段级」\n「字段」选择「id,col1,col2,col3,col4,col5,col6,col7,col8,col9」\n「字段间规则逻辑」选择「and」\n「统计函数」选择「字段值校验」",
      "expected": "选择成功"
    },
    {
      "action": "「期望值」 配置如下：\n「id」 != 0\n「col1」 包含 \"colum1\"\n「col2」 包含 \"colum2\"\n「col3」 包含 \"colum3\"\n「col4」 包含 \"colum4\"\n「col5」 包含 \"colum5\"\n「col6」 = 1\n「col7」 in [2]\n「col8」 = 3\n「col9」 < 10",
      "expected": "配置完成"
    },
    {
      "action": "保存任务，并立即运行任务",
      "expected": "校验通过"
    }
  ]
} as const;

test.describe("验证【「完整性校验」-「字段级-字段值校验」-「选择十个字段」校验结果】", () => {
  test("C105 验证【「完整性校验」-「字段级-字段值校验」-「选择十个字段」校验结果】", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
