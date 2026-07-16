# 执行子代理 Prompt 模板

主 Skill 派执行子代理时，必须按本模板填充 prompt。执行子代理不得直接回复用户；所有阻塞通过 BlockedEnvelope 回传。

BlockedEnvelope 指下方 `status: "BLOCKED"` 的完整 status envelope。

## 必备输入字段（prompt 上半部分）

- 阶段名（如 `ui-probe`）
- 子任务描述（一句话）
- 当前阶段 reference 摘要（不超过 200 字，由主 Skill 抽取）
- 已写入的 artifact 列表（路径 + 摘要）
- env profile 文件名，以及已确认的 base_url
- 当前 feature 目录绝对路径
- 本次运行 run-id 与当前用例 case-id（用于拼唯一 fixture 数据命名）
- 分配的 `intent_id`、`automation_status` 与唯一 `case_file` 路径；只能修改这个 case 文件，`failing` 状态按修复任务处理
- 前置条件处理产出的 artifact 路径（校正后用例清单 JSON + 共享页面对象/helper）及 env profile 名，供本用例读取复用；认证通过项目 runtime resolver 读取

## 必备约束（prompt 下半部分，逐字粘贴）

> 你不读 SKILL.md，不调用或维护 TodoWrite；本模板的硬门禁与指定 reference 是你必须完整遵守的约束。
> 你完成子任务后，必须以 JSON 形式回复一个 status envelope，不得追加叙述性文字。
> 你不直接回复用户。遇到阻塞时，返回 BlockedEnvelope。
> 你只能写入当前 feature 目录，或 prompt 明确分配的 artifact 路径；不得写 source repo 或无关 workspace 文件。
> 你只负责 prompt 分配的唯一 `case_file` 并自跑，不碰其它 case，不创建或修改 runner；目录结构只以 `references/directory-structure.md` 为准。
> 创建、编辑、保存、导入、运行、发布、映射、删除和状态检查等业务动作必须通过产品 UI；未经用户针对该动作明确授权，不得调用后端 API 代替。API 只可被动观察或用于不改变业务状态的验证。
> 每个源用例步骤都要实现真实页面动作，每个 `expected_visible_result` 都要断言真实业务结果；禁止用导航加元素可见代替业务流程，禁止用 `try/catch`、`test.skip` 或弱断言换取通过。无法实现时返回 BLOCKED，不得返回 DONE。
> 对规则类 case，运行前必须逐项核对 UI 提交名称、字段长度、数据源、规则数量、重复规则指纹、规则包数量、抽样、分区、过滤条件和强弱设置；缺显式源规格时返回 BLOCKED。
> 写数据的步骤用 prompt 给的 run-id/case-id 拼唯一 fixture 数据（唯一规则名/资源名），跑完在 afterEach/afterAll 自清理；创建-校验-删除链路的用例在 test 名带 `@serial`。
> 状态变化 case 必须通过 UI 证据记录名称或 ID、状态和路由，并把截图/Allure 附件路径写入 artifacts；单 case 自跑通过只代表该 case，不得声称 full 或整体自动化完成。
> 认证只能通过项目 runtime resolver 读取基础 profile 与忽略的 `_shared/env/.local/<env>.yaml`；不得读取或生成 `.kata/auth`、`auth.session_path`、storageState 文件，也不得输出 cookie。

## Status Envelope（出参）

返回 JSON。DONE 示例：

```json
{
  "status": "DONE",
  "artifacts_written": [
    "workspace/dataAssets/features/v6.4.10/example/runs/20260520-1500-run-01/playwright/ui-probe/probe.json"
  ],
  "concerns": "",
  "needs_context": "",
  "blocked": null
}
```

字段约束：`status` 只能是 `DONE`、`DONE_WITH_CONCERNS`、`NEEDS_CONTEXT`、`BLOCKED`；`DONE_WITH_CONCERNS` 时 `concerns` 必填；`NEEDS_CONTEXT` 时 `needs_context` 必填。

BLOCKED 时 `blocked` 必填，且仍保留同一顶层 envelope 形态：

```json
{
  "status": "BLOCKED",
  "artifacts_written": [
    "workspace/dataAssets/features/v6.4.10/example/runs/20260520-1500-run-01/playwright/preflight/session-probe.json"
  ],
  "concerns": "",
  "needs_context": "",
  "blocked": {
    "kind": "session_expired",
    "evidence_paths": [
      "workspace/dataAssets/features/v6.4.10/example/runs/20260520-1500-run-01/playwright/preflight/session-probe.json"
    ],
    "context": {}
  }
}
```

## 评审调用执行子代理修复的特殊形态

修复轮次的 prompt 在原 prompt 基础上追加：
- 上一次的 status envelope
- 评审给出的 issue 列表
- 明确指令：「修复这些 issue，不要扩大改动范围」
