// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0091",
  "title": "验证「完整性校验」-校验类型新增「多表数据内容对比」",
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
      "action": "校验类型 选择 「多表数据内容对比」",
      "expected": "选择成功"
    },
    {
      "action": "UI CHECK",
      "expected": "多表数据内容对表单配置项包含:1) 校验类型/字段/期望值/选择校验表主键/选择对比表1/输入分区/选择对比字段1/期望值/选择对比表1主键/选择判断关系/强弱规则/规则描述2) 选择校验表主键: 主键非必选，支持多选，多选后按照联合主键判断. 悬浮提示：\"若没有选择主键则不按照主键匹配的数据进行对比，分开校验均通过则校验通过。若选择多个主键则按照联合主键判断，按选择主键的字段顺序进行映射匹配\"3) 选择对比表1/选择对比字段: 仅支持单选, 但可以添加多个对比表, 最多添加至10个4) 选择判断关系: 支持且 / 或5) 按钮: 保存 / 取消"
    }
  ]
} as const;

test.describe("验证「完整性校验」-校验类型新增「多表数据内容对比」", () => {
  test("C0091 验证「完整性校验」-校验类型新增「多表数据内容对比」", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
