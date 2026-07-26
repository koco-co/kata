// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C035",
  "title": "验证【规则集】功能正常",
  "steps": [
    {
      "action": "新建规则集，选择 doris_demo_data_types_source 表，点击下一步",
      "expected": "进入规则配置步骤，页面显示\"规则集配置\""
    },
    {
      "action": "点击【下载规则模板】，按前置条件中的 4 条 SQL 填写模板，上传文件",
      "expected": "上传成功；规则列表显示 4 条规则，SQL 内容与填写内容一致"
    },
    {
      "action": "配置周期调度（如按天），点击【创建】",
      "expected": "规则集创建成功，规则集列表显示新增一条记录，状态正常"
    },
    {
      "action": "点击【立即执行】，等待实例完成，查看运行结果",
      "expected": "质量实例状态\"运行成功\"；SQL3（user_id>1005 无数据）返回 0 行；SQL1/2 返回 3 行；SQL4 返回 3 行；所有结果与表数据（3 条）一致"
    }
  ]
} as const;

test.describe("验证【规则集】功能正常", () => {
  test("C035 验证【规则集】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
