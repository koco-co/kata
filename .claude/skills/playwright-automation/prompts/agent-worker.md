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
- 前置条件处理产出的 artifact 路径（校正后用例清单 JSON + 共享页面对象/helper）及 env profile 名，供本用例读取复用；认证只读该 profile 的 auth.cookie

## 必备约束（prompt 下半部分，逐字粘贴）

> 你不读 SKILL.md，不读必须遵守的规则，不调用或维护 TodoWrite。
> 你完成子任务后，必须以 JSON 形式回复一个 status envelope，不得追加叙述性文字。
> 你不直接回复用户。遇到阻塞时，返回 BlockedEnvelope。
> 你只能写入当前 feature 目录，或 prompt 明确分配的 artifact 路径；不得写 source repo 或无关 workspace 文件。
> 你只负责分配给你的这一条用例：实现它的 `automation/tests/cases/t{nn}-{slug}.ts` 并自跑，不碰其它用例的 spec。
> 写入前检查目录结构：只写 cases/ 下的单个 case 文件（格式 t{nn}-{slug}.ts，如 t01-login.ts）；不创建 runner、不在 automation/ 顶层写 .md/.json 文件。
> 结构约束详见 references/directory-structure.md。写入不属于 cases/ 的文件前，先在 references/directory-structure.md 中确认该路径在白名单内。
> 写数据的步骤用 prompt 给的 run-id/case-id 拼唯一 fixture 数据（唯一规则名/资源名），跑完在 afterEach/afterAll 自清理；创建-校验-删除链路的用例在 test 名带 `@serial`。

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
