// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C427",
  "title": "验证识别规则操作符-包含",
  "steps": [
    {
      "action": "位置：「数据安全」-「数据脱敏管理」\n1）新增一条脱敏规则\n2）为该脱敏规则新增脱敏表，配置识别规则为：字段名 包含 tuo",
      "expected": "脱敏表新增成功；"
    },
    {
      "action": "脱敏表列表页，点击该脱敏表的数据源名称；\n查看详情抽屉-识别规则",
      "expected": "识别规则内容为：字段名 包含 tuo"
    },
    {
      "action": "脱敏表列表页，编辑该脱敏表的识别规则为：字段名 包含 tuomin\n保存",
      "expected": "脱敏表保存成功\n识别规则内容为：字段名 包含 tuomin"
    },
    {
      "action": "数据地图进入此表的表详情页；\n进入“数据预览”tab页，查看预览数据",
      "expected": "tuoming、atuominb和tuomin字段数据脱敏显示，其他字段数据明文显示"
    }
  ]
} as const;

test.describe("验证识别规则操作符-包含", () => {
  test("C427 验证识别规则操作符-包含", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
