// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C013",
  "title": "验证跨源数据对比仅配置行数差异比对(SparkThrift2.x不支持)",
  "steps": [
    {
      "action": "进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待规则类型选择入口展示",
      "expected": "页面可选择多表比对规则"
    },
    {
      "action": "选择【多表比对规则】，等待【选择对比表】页面加载完成",
      "expected": "步骤条展示选择对比表、选择字段、执行配置"
    },
    {
      "action": "输入规则名称“v63跨源数据对比任务”",
      "expected": "规则名称输入框展示“v63跨源数据对比任务”"
    },
    {
      "action": "选择对比类型【跨源数据对比】",
      "expected": "页面展示跨源数据对比说明，提示跨源比对内容仅支持行数差异比对"
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
      "action": "对照表选择另一已授权数据源",
      "expected": "对照表数据库下拉框加载完成；若无第二数据源，本用例记录为环境阻塞"
    },
    {
      "action": "对照表选择 dq_test_user_info_300 或同结构对照表",
      "expected": "对照表信息展示完整"
    },
    {
      "action": "点击【下一步】，等待字段选择页面加载完成",
      "expected": "字段映射区域展示逻辑主键和差异设置"
    },
    {
      "action": "配置 id 为逻辑主键，勾选行数差异比对，阈值配置为 0",
      "expected": "行数差异比对配置完成"
    },
    {
      "action": "点击【下一步】，等待执行配置页面加载完成",
      "expected": "页面展示实例生成方式和保存入口"
    },
    {
      "action": "实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成",
      "expected": "跨源数据对比任务创建成功"
    },
    {
      "action": "点击【立即执行】，等待任务实例查询生成最新实例",
      "expected": "若两表记录一致，实例状态为校验通过；若记录数不一致，实例状态为校验异常并展示行数差异"
    }
  ]
} as const;

test.describe("验证跨源数据对比仅配置行数差异比对(SparkThrift2.x不支持)", () => {
  test("C013 验证跨源数据对比仅配置行数差异比对(SparkThrift2.x不支持)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
