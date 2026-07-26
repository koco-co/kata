// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C147",
  "title": "验证个性业务属性-新增功能交互正常",
  "steps": [
    {
      "action": "1）进入元数据-元模型管理-${DATASOURCE_TYPE}的元模型管理页面-个性业务属性页面\n2）选择某子模型，点击【新增个性属性】",
      "expected": "显示新增弹窗"
    },
    {
      "action": "必填项校验：\n只输入必填项，点击【确定】",
      "expected": "1）弹窗关闭，提示新建成功\n2）列表刷新"
    },
    {
      "action": "必填项校验：\n存在一个必填项未输入，点击【确定】",
      "expected": "提示必填项不能空"
    },
    {
      "action": "必填项校验：\n输入所有表单元素值，点击【确定】",
      "expected": "1）弹窗关闭，提示新建成功\n2）列表刷新"
    },
    {
      "action": "查看属性类型选项",
      "expected": "选项包括“枚举”、“文本框”、“树形目录”"
    },
    {
      "action": "属性类型选择“枚举”",
      "expected": "下方显示“选项”配置区"
    },
    {
      "action": "属性类型选择“文本框”",
      "expected": "下方显示“字段类型”下拉项，下拉选项为：string和bigint"
    },
    {
      "action": "属性类型选择“树形目录”",
      "expected": "下方显示“编辑目录”配置项"
    }
  ]
} as const;

test.describe("验证个性业务属性-新增功能交互正常", () => {
  test("C147 验证个性业务属性-新增功能交互正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
