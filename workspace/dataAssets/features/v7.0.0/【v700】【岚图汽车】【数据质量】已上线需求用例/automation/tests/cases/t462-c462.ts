// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C462",
  "title": "验证【规则任务管理❯ 运行方式】规则任务支持「实例生成方式」",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "新建规则任务A, 配置监控对象、监控规则后, 检查调度属性页面",
      "expected": "调度配置中新增字段: 实例生成方式"
    },
    {
      "action": "检查实例生成方式配置项",
      "expected": "1) 枚举: T+1生成(默认)、立即生成2) 悬浮提示: 选中「T+1生成」，代表实例生成按照配置项设置的时间生成实例，默认是22：00；选中「立即生成」，代表提交后立即生成当天开始未来时间内的实例，之后的实例生成还是按照配置项设置的时间生成实例；"
    },
    {
      "action": "保存规则任务, 检查规则任务详情页",
      "expected": "新增字段: 实例生成方式, 回显内容正确"
    },
    {
      "action": "选择规则任务A, 进入任务详情页-「编辑调度属性」配置页面",
      "expected": "调度配置中存在字段: 实例生成方式"
    },
    {
      "action": "检查实例生成方式配置项",
      "expected": "1) 枚举: T+1生成(默认)、立即生成2) 悬浮提示: 选中「T+1生成」，代表实例生成按照配置项设置的时间生成实例，默认是22：00；选中「立即生成」，代表提交后立即生成当天开始未来时间内的实例，之后的实例生成还是按照配置项设置的时间生成实例；"
    }
  ]
} as const;

test.describe("验证【规则任务管理❯ 运行方式】规则任务支持「实例生成方式」", () => {
  test("C462 验证【规则任务管理❯ 运行方式】规则任务支持「实例生成方式」", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
