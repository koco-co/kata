// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0378",
  "title": "验证【点击临时保存规则后，留存在当前页面不进行跳转，并提示\"规则已临时保存\"】规则配置中间态保存不进行页面跳转（监控规则处保存）",
  "steps": [
    {
      "action": "进入【资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击【新建监控规则】按钮",
      "expected": "进入[监控对象]配置页面"
    },
    {
      "action": "前提条件标示",
      "expected": "4. [监控对象]配置完成"
    },
    {
      "action": "监控对象配置如下：[规则名称] test[选择数据源] doris2x_test[Doris2.x]（选择数据库） DataQuery_Doris[选择数据表] user_profile_0919[选择分区] 默认",
      "expected": "进入[监控规则]配置页面"
    },
    {
      "action": "点击【下一步】按钮",
      "expected": "页面新增[完整性验证]配置栏"
    },
    {
      "action": "点击【添加规则】按钮-选择[完整性验证]",
      "expected": "[完整性验证]配置完毕"
    },
    {
      "action": "完整性验证配置如下：[规则类型] 多表数据行数对比[选择对比表]- [对比表所属库] DataQuery_Doris [对比表] user_profile_4023 [输入分区] 默认[强弱规则] 弱规则[规则描述] 不作填写",
      "expected": "弹出提示框\"规则已临时保存\"，不会自动返回至【规则任务管理】列表页面"
    },
    {
      "action": "点击临时保存",
      "expected": "列表中【test】规则勾选框无法编辑，无法点击【test】规则弹出详情页面，[执行周期]、[规则状态]、[是否关联任务]为\"--\"；点击[编辑]按钮后跳转至[监控对象]配置页面"
    },
    {
      "action": "返回【规则任务管理】列表中找到【test】规则，点击编辑",
      "expected": "【test】规则内容成功保存"
    },
    {
      "action": "查看【监控对象】内容验证临时保存效果",
      "expected": "跳转至[监控规则]配置页面"
    },
    {
      "action": "点击【下一步】按钮",
      "expected": "【test】规则内容成功保存"
    },
    {
      "action": "查看【监控规则】内容验证临时保存效果",
      "expected": "跳转至[调度属性]配置页面"
    },
    {
      "action": "点击【下一步】按钮",
      "expected": "[调度属性]配置完成"
    },
    {
      "action": "调度配置配置如下：[调度周期] 天[生效日期] 2025-12-08→2125-12-08[具体时间] 00：00[规则拼接包] 1",
      "expected": "成功保存，返回至【规则任务管理】列表"
    },
    {
      "action": "点击【保存】按钮",
      "expected": "成功运行规则"
    },
    {
      "action": "在【规则任务管理】列表中找到【test】规则，点击【test】进入详情页面，点击【立即执行】按钮",
      "expected": "成功生成对应内容"
    },
    {
      "action": "在【校验结果查询】/【数据质量报告】中查询【test】任务产生的实例及报告",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【点击临时保存规则后，留存在当前页面不进行跳转，并提示\"规则已临时保存\"】规则配置中间态保存不进行页面跳转（监控规则处保存）", () => {
  test("C0378 验证【点击临时保存规则后，留存在当前页面不进行跳转，并提示\"规则已临时保存\"】规则配置中间态保存不进行页面跳转（监控规则处保存）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
