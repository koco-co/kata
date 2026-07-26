// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C058",
  "title": "验证【表结构】-【字段】模块功能正常",
  "steps": [
    {
      "action": "查看字段列表信息",
      "expected": "显示：字段名、字段描述、字段标签、字段中文名、数据类型、数据精度、字段最大长度、可空标识Y/N、主键标识Y/N、默认值"
    },
    {
      "action": "输入id，点击搜索按钮",
      "expected": "1. 存在字段为\"id\"，则匹配成功\n2. 不存在字段为\"id\"，则展示“暂无数据”缺省页"
    },
    {
      "action": "输入“姓名”，点击搜索按钮",
      "expected": "1. 存在字段描述为\"姓名\"，则匹配成功\n2. 不存在字段描述为\"姓名\"，则展示“暂无数据”缺省页"
    },
    {
      "action": "输入“id_tag”,点击搜索按钮",
      "expected": "1. 存在字段标签为\"id_tag\"，则匹配成功\n2. 不存在字段标签为\"id_tag\"，则展示“暂无数据”缺省页"
    }
  ]
} as const;

test.describe("验证【表结构】-【字段】模块功能正常", () => {
  test("C058 验证【表结构】-【字段】模块功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
