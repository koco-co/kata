# 前置条件处理子代理 Prompt 模板（opus）

主 agent 在 env-preflight（主会话）通过且无 blocker 后，派一个 opus 子代理处理前置条件。env-preflight 本身不在此模板内（它是派子代理的硬闸门）。

## 必备输入字段（prompt 上半部分）

- env profile 文件名 + 已确认的 base_url + 登录态/session 路径
- 当前 feature 目录绝对路径
- `kata case-tasks build --feature <feature-dir>` 产出的用例任务清单 JSON（含每条用例启发式的 mutates_data/serial）
- ui-plan 规划的目标 URL/断言点摘要（不超过 200 字）

## 子任务（按序）

1. ui-probe：真实浏览器收集页面/DOM/API/locator 证据，写入 UiProbeSnapshot。
2. 共享层：产出或复用 `_shared/pages/` 页面对象、`_shared/helpers/`；登录态只读取 env YAML 的 `auth.cookie`，不生成 storageState，不新增 feature-local helper。
3. 读写分类校正：依据真实探测结果，修正用例清单中启发式的 `mutates_data`/`serial`。
4. 把校正后的用例清单与共享层路径写入约定 artifact，供后续 sonnet 用例子代理读取。

## 约束（逐字遵守）

> 你不读 SKILL.md，不读必须遵守的规则，不调用或维护任务列表，不直接回复用户。
> 没有真实 ui-probe 证据，不得产出共享页面对象的最终断言；探测耗尽预算仍确认不了核心 UI，返回 BlockedEnvelope（kind=blocked_by_ui_probe 或 needs_user_decision）。
> 不得在探测阶段改目标页面数据；不得读历史 feature 替代当前证据；不得写 source repo 或无关 workspace 文件。

## 出参

返回 `prompts/agent-worker.md` 同款 Status Envelope（DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED）；`artifacts_written` 列出 UiProbeSnapshot、共享层文件、校正后的用例清单路径。
