# Kata TUI 架构

## 目标

`kata` 同时服务两类用户：CLI 给脚本、CI 和 AI 模型快速调用；TUI 给人类在终端里浏览和操作 workspace。两套界面共享命令定义与执行逻辑，不维护两份实现。

## 入口契约

- 非 TTY：永远走 CLI；裸 `kata` 只输出 help 或错误，不进入 TUI。
- TTY：`kata` 或 `kata tui` 进入 TUI。
- 任何环境：`--no-interactive` 强制 CLI，`--interactive` 强制 TUI。
- `kata cases build <requirementId>` 在 TTY 下可快速进入对应 feature 的 TUI 页面；带 `--format` 或 `--no-interactive` 时保持 CLI。

## 架构

- 命令注册表：统一描述命令层级、动作、执行函数与副作用分类。
- CLI 执行器：Commander 注册命令并输出文本/JSON。
- TUI 渲染器：基于 `@clack/prompts` 的交互式选择/输入表单，调用同一批执行函数。
- History：`~/.config/kata/history.json`，记录最近 5 个 Feature，按时间倒序，不进 Git；可用 `KATA_HISTORY_FILE` 覆盖，便于测试。

## TUI 导航

主导航以对象为主：

- `Features` -> 项目 -> 迭代版本 -> Feature -> `Lint/Build/View YAML`。
- `Cases` 只放全局动作：`List/Build/Lint`。
- `History` 展示最近操作过的 5 个 Feature，可快速回到对应动作页。
- 未接入 TUI 的命令不显示入口，不堆 `CLI only` 占位。

## TUI 开放范围

只开放本地、低风险、适合人类交互的功能：

- 对象浏览：`Features`、`Cases List`、`History`。
- 本地只读检查：`cases lint`、`features show`、`project scan`、`config list/show/doctor`、`knowledge read/list/index/lint`、`runs verify/path`、`automation lint/coverage`。
- 多步本地生成：`cases build/import/sync`、`automation scaffold`、`project create/repair`、`scans create`、`defects hotfix/lint`。

以下功能保持 CLI-only，不进入 TUI：`env`、`zentao`、`notify`、`infra`、`repos` 写操作、`runs exec/prune`、`defects publish`、`prd finalize`。

## 安全规则

- 写文件、外发请求、SSH、私密配置等动作在 TUI 中统一经过 `预览 + 确认`。
- 只读动作直接执行。
- 历史写入失败不阻断 TUI。
- 非 TTY 调用绝不进入 TUI。

## 落地阶段

1. 第一阶段：入口契约、TUI 框架、`Features/Cases/History`。
2. 第二阶段：`Config/Knowledge/Project/Runs verify/Automation lint`。
3. 第三阶段：`Cases Import/Sync`、`Scans/Defects` 等本地生成命令。

每个阶段独立验证 CLI 不回归、TUI 可操作后再进入下一阶段。
