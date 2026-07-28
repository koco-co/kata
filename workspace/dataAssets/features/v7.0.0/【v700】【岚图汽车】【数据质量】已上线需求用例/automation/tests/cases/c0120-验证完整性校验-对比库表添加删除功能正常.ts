// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0120",
  "title": "验证「完整性校验」-对比库表添加/删除功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」后, 填写完「监控对象」表单, 点击「下一步」, 在「监控规则」表单中点击「添加规则-完整性校验」, 校验类型选择「多表数据行数对比」",
      "expected": "显示「完整性校验-多表数据行数对比」表单配置项"
    },
    {
      "action": "选择第一个库/表/分区选项后, 点击「+」按钮",
      "expected": "1) 新增一行库/表/分区配置项2) 第二行的数据库默认选择上一步骤选择的数据库，可修改为当前源下的其他库3) 出现「-」按钮, 可以删除配置项"
    },
    {
      "action": "依次添加至10行配置后, 再次点击「+」",
      "expected": "提示: 「最多添加10个对比表」"
    },
    {
      "action": "点击\"-\"删除按钮",
      "expected": "成功删除该行对比表"
    },
    {
      "action": "删除所有对比表",
      "expected": "提示: 请选择对比表"
    }
  ]
} as const;

test.describe("验证「完整性校验」-对比库表添加/删除功能正常", () => {
  test("C0120 验证「完整性校验」-对比库表添加/删除功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
