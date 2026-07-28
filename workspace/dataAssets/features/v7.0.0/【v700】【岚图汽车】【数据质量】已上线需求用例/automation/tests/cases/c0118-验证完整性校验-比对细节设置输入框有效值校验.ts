// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0118",
  "title": "验证「完整性校验」-「比对细节设置」输入框有效值校验",
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
      "action": "配置「数据源」「数据库」「数据表」等信息，选择【完整性校验】规则",
      "expected": "选择成功，展示【完整性校验】规则配置项"
    },
    {
      "action": "「校验类型」选择「多表数据行数对比」后, 点击「比对细节设置」",
      "expected": "弹出「多表数据一致性比对设置」弹窗"
    },
    {
      "action": "百分比差异选项中的【】输入非数字字符「测试」",
      "expected": "前端限制, 无法输入"
    },
    {
      "action": "百分比差异选项中的【】输入最小值「0」后确定",
      "expected": "重置为00.00"
    },
    {
      "action": "百分比差异选项中的【】输入「99.99」后确定",
      "expected": "重置为99.99"
    },
    {
      "action": "百分比差异选项中的【】输入「99999」后确定",
      "expected": "重置为最大值「100.00」"
    },
    {
      "action": "数量差异选项中的【】输入非数字字符「测试」",
      "expected": "前端限制, 无法输入"
    },
    {
      "action": "数量差异选项中的【】输入最小值「0」后确定",
      "expected": "显示为0"
    },
    {
      "action": "数量差异选项中的【】输入「10000」后确定",
      "expected": "重置为最大值「9999」"
    }
  ]
} as const;

test.describe("验证「完整性校验」-「比对细节设置」输入框有效值校验", () => {
  test("C0118 验证「完整性校验」-「比对细节设置」输入框有效值校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
