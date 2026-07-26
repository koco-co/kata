// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C224",
  "title": "验证数据质量规范性校验绑定标准展示正确",
  "steps": [
    {
      "action": "新建测试表，包括id,name,class,age,weight,test1,test2几个字段，并按格式打入测试数据，1，张三，a，11，72.11，1，1；2，李四，b，20，60.22，2，2",
      "expected": "新增测试表成功"
    },
    {
      "action": "新建数据标准，设置取值范围<10，绑定测试表id字段",
      "expected": "数据标准新增并绑定字段成功"
    },
    {
      "action": "新建数据标准，设置字符串长度为10，绑定测试表name字段",
      "expected": "数据标准新增并绑定字段成功"
    },
    {
      "action": "新增数据标准，设置枚举范围为abcd，绑定测试表class字段",
      "expected": "数据标准新增并绑定字段成功"
    },
    {
      "action": "新增数据标准，设置数据精度小数点前4后2，绑定测试表weight字段",
      "expected": "数据标准新增并绑定字段成功"
    },
    {
      "action": "新增数据标准，设置空值为不可空，绑定测试表test1字段",
      "expected": "数据标准新增并绑定字段成功"
    },
    {
      "action": "新增数据标准，设置重复为不可重复，绑定测试表test2字段",
      "expected": "数据标准新增并绑定字段成功"
    },
    {
      "action": "新增质量任务规则，选择对应测试表字段",
      "expected": "显示“是否引用标准规则”"
    },
    {
      "action": "引用标准规则后校验所有规则对应函数",
      "expected": "与实际数据一致"
    },
    {
      "action": "进行规范性校验",
      "expected": "校验结果与实际数据一致"
    },
    {
      "action": "查看规则管理-监控规则-规范性校验内数据展示",
      "expected": "展示的样式及数据与之前配置数据一致"
    },
    {
      "action": "查看任务监控报告数据展示",
      "expected": "展示的样式及数据与之前配置数据一致"
    }
  ]
} as const;

test.describe("验证数据质量规范性校验绑定标准展示正确", () => {
  test("C224 验证数据质量规范性校验绑定标准展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
