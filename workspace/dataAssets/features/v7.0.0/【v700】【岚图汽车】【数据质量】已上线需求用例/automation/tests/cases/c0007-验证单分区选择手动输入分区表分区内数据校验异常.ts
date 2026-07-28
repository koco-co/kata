// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0007",
  "title": "验证【单分区】选择手动输入分区，表分区内数据校验异常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】-单表校验规则",
      "expected": "进入监控对象界面"
    },
    {
      "action": "输入\n规则名称：weiyi_07\n选择数据源：已有数据源\n选择数据库：已有数据库\n选择数据表：已有数据表\n点击下一步",
      "expected": "进入监控规则界面"
    },
    {
      "action": "点击添加规则-唯一性校验",
      "expected": "展示唯一性校验具体配置框"
    },
    {
      "action": "输入\n选择校验字段逻辑：唯一\n选择和其他表的校验关系：且\n选择对比表：test_doris_01\n选择对比表字段：id、name\n输入分区：手动输入分区-dt=\"2025-01-01\"\n选择校验字段逻辑：唯一\n点击保存、下一步",
      "expected": "进入调度属性配置界面"
    },
    {
      "action": "选项均为默认，点击新建",
      "expected": "提示规则新建成功"
    },
    {
      "action": "点击所建规则查看详细信息",
      "expected": "基本信息、监控规则内容符合预期"
    },
    {
      "action": "点击立即执行-进入校验结果查询",
      "expected": "校验完成后状态显示校验异常\n进入详情查看，表id、name字段均不唯一"
    }
  ]
} as const;

test.describe("验证【单分区】选择手动输入分区，表分区内数据校验异常", () => {
  test("C0007 验证【单分区】选择手动输入分区，表分区内数据校验异常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
