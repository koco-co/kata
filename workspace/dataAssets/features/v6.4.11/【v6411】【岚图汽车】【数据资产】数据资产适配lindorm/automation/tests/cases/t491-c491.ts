// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C491",
  "title": "验证数据源删除-逻辑功能正确",
  "steps": [
    {
      "action": "删除数据源D",
      "expected": "1）删除成功；\n2）列表刷新，不显示数据源D"
    },
    {
      "action": "查看引入数据源弹窗",
      "expected": "可以看到数据源D为待引入数据源"
    },
    {
      "action": "查看数据地图，该数据源下原先已同步的表",
      "expected": "1）该数据源下已同步的表均被删除（数据地图中无法查询到）\n2）该数据源下已同步的表与数据目录的关系清空"
    },
    {
      "action": "查看元数据管理-数据源列表",
      "expected": "数据源列表不显示该数据源"
    },
    {
      "action": "查看订阅的数据",
      "expected": "订阅列表不显示对应已删除的表"
    },
    {
      "action": "查看数据标准-标准映射",
      "expected": "映射记录中对应已删除表的原先标准映射数据不显示"
    },
    {
      "action": "查看数据模型-建表",
      "expected": "列表中不展示该数据源下创建的模型"
    },
    {
      "action": "查看数据模型-我的模型-已审批/审批中",
      "expected": "列表不展示该数据源下模型的审批数据"
    },
    {
      "action": "查看数据安全-数据脱敏管理",
      "expected": "脱敏规则-脱敏应用中不展示对应表"
    },
    {
      "action": "查看数据安全-数据权限管理-数据权限管理",
      "expected": "权限分配/权限回收-不展示对应数据源/表权限数据"
    },
    {
      "action": "查看数据安全-数据权限管理-我的权限查看",
      "expected": "不展示对应数据源/表权限数据"
    },
    {
      "action": "查看数据安全-数据分级分类-自动分级",
      "expected": "不展示对应数据源/表自动分级数据"
    },
    {
      "action": "查看数据安全-数据分级分类-分级数据",
      "expected": "不展示对应数据源/表分级数据"
    }
  ]
} as const;

test.describe("验证数据源删除-逻辑功能正确", () => {
  test("C491 验证数据源删除-逻辑功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
