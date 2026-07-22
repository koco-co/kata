# Playwright 运行与交付合同

## Manifest

`automation/manifest.yaml` 描述一次自动化能力，而不是一次运行：

```yaml
schema_version: 1
feature_id: example
suites:
  full:
    specs:
      - tests/cases/create-rule.spec.ts
    expected_cases: 4
core_actions_must_use_ui: true
setup_channels: [ui, api]
cleanup: targeted
artifacts: [summary, screenshot, trace-on-failure, allure]
```

## 运行记录

`runs/<run-id>/run.json`：

```json
{
  "schema_version": 1,
  "status": "passed",
  "mode": "run",
  "environment": "test-env",
  "scope": {
    "declared": 4,
    "selected": 4,
    "executed": 4
  },
  "command": "bunx playwright test ...",
  "exit_code": 0,
  "counts": {
    "passed": 4,
    "failed": 0,
    "skipped": 0
  },
  "records": [
    {"kind": "quality-task", "name": "kata-20260721-ab12", "cleanup": "done"}
  ],
  "artifacts": ["artifacts/trace.zip", "artifacts/allure-results"],
  "unresolved": []
}
```

## 状态

- `reviewed`：只完成静态审查。
- `generated-not-run`：脚本已生成，没有真实运行。
- `passed`：声明范围全部执行，退出码为 0，计数一致，核心记录已确认。
- `failed`：已运行且存在失败。
- `blocked`：环境、权限、数据或必要输入使运行无法开始或继续。

`smoke` 通过只能说明 smoke 范围；不得表述为完整范围通过。

## 修复与重试

先分类，再决定：

| 类别 | 默认处理 |
| --- | --- |
| 网络瞬断、临时 5xx | 在有限退避后重试一次。 |
| 元素不存在、断言不符 | 检查页面与脚本，不盲目重试。 |
| 数据冲突 | 生成新唯一数据或修复准备逻辑。 |
| 权限、租户不符 | 立即阻塞。 |
| 产品缺陷 | 保留产物，报告复现步骤，不弱化断言。 |
| 无法分类 | 收集 trace/日志后停止自动重试。 |

修复循环以“新的信息或修改”为前提；没有变化时不重复运行。

## 人类摘要

`summary.md` 使用固定顺序：范围、环境、结果、失败/排除项、业务记录、产物、清理情况。文字必须与 `run.json` 一致。
