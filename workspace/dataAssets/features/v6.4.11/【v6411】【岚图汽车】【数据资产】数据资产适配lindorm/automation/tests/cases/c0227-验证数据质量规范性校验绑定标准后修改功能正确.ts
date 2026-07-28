// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0227",
  "title": "验证数据质量规范性校验绑定标准后修改功能正确",
  "steps": [
    {
      "action": "1.新建测试表，包括id,name,class,age,weight,test1,test2几个字段，并按格式打入测试数据，1，张三，a，11，72.11，1，1；2，李四，b，20，60.22，2，2\n2 新建数据标准，设置取值范围<10，绑定测试表id字段\n3新建数据标准，设置字符串长度为10，绑定测试表name字段\n4新增数据标准，设置枚举范围为abcd，绑定测试表class字段\n5新增数据标准，设置数据精度小数点前4后2，绑定测试表weight字段\n6新增数据标准，设置空值为不可空，绑定测试表test1字段\n7新增数据标准，设置重复为不可重复，绑定测试表test2字段\n8新增质量任务规则，选择对应测试表字段",
      "expected": "显示“是否引用标准规则”"
    },
    {
      "action": "修改空值数校验方法为其他类型，!=0；重复值校验方法为其他类型，<1；字符串长度校验方法为其他类型，>=2",
      "expected": "正常修改，当校验方法其他类型后，运算符号不支持“=”"
    },
    {
      "action": "1 删除数据精度的小数点后位数值\n2修改取值范围字段为>2\n3进行规范性校验",
      "expected": "校验结果与实际数据一致"
    },
    {
      "action": "查看任务监控报告数据展示",
      "expected": "展示的样式及数据与之前配置数据一致"
    }
  ]
} as const;

test.describe("验证数据质量规范性校验绑定标准后修改功能正确", () => {
  test("C0227 验证数据质量规范性校验绑定标准后修改功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
