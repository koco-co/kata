// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0477",
  "title": "验证【规则任务管理❯】调度属性新增环境参数配置(SparkThrift2.x)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步",
      "expected": "进入【新建单表校验规则 ❯ 调度属性】配置页面"
    },
    {
      "action": "检查调度配置信息",
      "expected": "新增配置: 环境参数配置"
    },
    {
      "action": "点击【环境参数配置】",
      "expected": "进入【环境参数配置】页面, 可进行编辑"
    },
    {
      "action": "取消/确定",
      "expected": "配置页面关闭 / 配置内容保存成功"
    }
  ]
} as const;

test.describe("验证【规则任务管理❯】调度属性新增环境参数配置(SparkThrift2.x)", () => {
  test("C0477 验证【规则任务管理❯】调度属性新增环境参数配置(SparkThrift2.x)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
