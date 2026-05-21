# Case Feedback

仅在 workflow 进入 `case-feedback` 阶段时读取。该阶段把 UI 自动化运行、真实页面探测或人工复核中发现的用例问题，整理为可执行的用例修正建议。

## 输入证据

- `ui.automation.intent@1`：当前自动化目标、用例或需求来源。
- `ui.probe.snapshot@N`：真实页面、DOM、截图、网络或 locator 证据。
- `self.run.result@N`：已执行的 Playwright 命令、退出码、通过/失败/跳过数量和报告路径。

## 输出要求

- 只输出可落到 case artifact 的修正建议，不重写整套用例。
- 每条建议必须包含：目标用例或步骤、问题证据、建议修改、风险等级。
- 若反馈来自失败运行，必须区分产品缺陷、脚本问题、数据/权限/环境问题和用例描述问题。
- 对页面按钮、字段、路由、菜单、toast、弹窗等 UI 事实，必须引用真实 DOM 或截图证据；不得把历史用例或猜测当成本次页面事实。
- 无证据或范围不明的修改写入 pending，不得直接改写 case。

## 修正清单格式

```json
{
  "corrections": [
    {
      "target": "archive.md#用例标题/步骤编号",
      "severity": "high|medium|low",
      "evidence": "ui.probe.snapshot@1 或 self.run.result@1",
      "problem": "当前描述的问题",
      "suggestion": "建议修改为可执行表述"
    }
  ],
  "pending_items": []
}
```
