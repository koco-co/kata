// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0228",
  "title": "验证引用标准后清空质量规则功能正确",
  "steps": [
    {
      "action": "1新建测试表，包括id,name,class,age,weight,test1,test2几个字段，并按格式打入测试数据，1，张三，a，11，72.11，1，1；2，李四，b，20，60.22，2，2\n2新建数据标准，设置取值范围<10，绑定测试表id字段\n3新建数据标准，设置字符串长度为10，绑定测试表name字段\n4新增数据标准，设置枚举范围为abcd，绑定测试表class字段\n5新增数据标准，设置数据精度小数点前4后2，绑定测试表weight字段\n6新增数据标准，设置空值为不可空，绑定测试表test1字段\n7新增数据标准，设置重复为不可重复，绑定测试表test2字段\n8新增质量任务规则，选择对应测试表字段",
      "expected": "显示“是否引用标准规则”"
    },
    {
      "action": "引用标准规则后校验所有规则对应函数",
      "expected": "与实际数据一致"
    },
    {
      "action": "删除所有引用的标准规则进行创建",
      "expected": "无法正常创建规则"
    }
  ]
} as const;

test.describe("验证引用标准后清空质量规则功能正确", () => {
  test("C0228 验证引用标准后清空质量规则功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
