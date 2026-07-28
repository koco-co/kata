// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0012",
  "title": "验证同源数据对比规则创建和执行成功",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待规则类型选择入口展示",
      "expected": "页面可选择单表校验规则或多表比对规则"
    },
    {
      "action": "选择【多表比对规则】，等待新建多表比对规则页面加载完成",
      "expected": "步骤条展示【选择对比表】【选择字段】【执行配置】"
    },
    {
      "action": "在【选择对比表】输入规则名称“v63同源数据对比任务”",
      "expected": "规则名称输入框展示该名称"
    },
    {
      "action": "选择对比类型【同源数据对比】",
      "expected": "主表和对照表区域展示同一数据源选择逻辑"
    },
    {
      "action": "主表选择 SparkThrift 数据源",
      "expected": "主表数据库下拉框加载完成"
    },
    {
      "action": "主表选择数据库 pw_test",
      "expected": "主表数据表下拉框加载完成"
    },
    {
      "action": "主表选择数据表 dq_test_user_info_300",
      "expected": "主表信息展示完整"
    },
    {
      "action": "对照表选择同一 SparkThrift 数据源",
      "expected": "对照表数据库下拉框加载完成"
    },
    {
      "action": "对照表选择数据库 pw_test",
      "expected": "对照表数据表下拉框加载完成"
    },
    {
      "action": "对照表选择数据表 dq_test_user_info_300",
      "expected": "对照表信息展示完整"
    },
    {
      "action": "点击【下一步】，等待【选择字段】页面加载完成",
      "expected": "页面提示通过连线配置字段映射，并展示【同名映射】能力"
    },
    {
      "action": "点击【同名映射】，等待字段映射关系生成完成",
      "expected": "id、user_code、user_name、score 等同名字段完成映射"
    },
    {
      "action": "选择 id 为逻辑主键",
      "expected": "id 字段标记为逻辑主键"
    },
    {
      "action": "勾选记录数差异比对，差异阈值配置为 0，点击【下一步】，等待执行配置页面加载完成",
      "expected": "进入执行配置页面"
    },
    {
      "action": "实例生成方式选择【立即生成】，点击【保存】，等待任务列表刷新完成",
      "expected": "多表比对任务“v63同源数据对比任务”创建成功"
    },
    {
      "action": "点击任务【立即执行】，等待任务实例查询生成最新实例",
      "expected": "最新实例状态为校验通过，整体校验差异总数为 0"
    }
  ]
} as const;

test.describe("验证同源数据对比规则创建和执行成功", () => {
  test("C0012 验证同源数据对比规则创建和执行成功", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
