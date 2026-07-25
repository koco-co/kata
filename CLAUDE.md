# CLAUDE.md

公开命令见下方「命令索引」；CLI 用法见 `kata --help`；首次安装见仓库根目录的 `INSTALL.md`。

`.claude/` 是 Claude Code 的 runtime 实现目录。

## Claude Code Runtime 规则

- Claude Code skill 的稳定触发信号来自 `.claude/skills/<name>/SKILL.md` frontmatter 的 `name` 与 `description`。
- `/skill` 名继续可用；显式的 `/test-case`、`/ui-automation` 等命令，按下方路由表处理。
- 本项目不再拿 `CLAUDE.local.md` 当入口；本地设置放用户级配置或 `.claude/settings.local.json`。

## 路由规则

- 下方命令索引即公开 slash-command 的路由表。
- 只发 Lanhu/Axure URL → 静默转给 `test-case`（create 工作流），由它产出第一个用户可见结果。
- 只发 ZenTao bug URL/bug-view URL/bug ID → 转给 `test-case`（hotfix 工作流）；记录未修复或缺修复范围时，由该 skill 生成待办项。
- 只发需求功能**目录**路径或目录名（如 `features/【v...】...`，不带文件扩展名）→ 转给 `ui-automation`，做用例转自动化。
- 用户给出用例产物**文件**路径（`.yaml`/`.xmind`/`.csv`/`.md`），或要求编辑、同步、标准化已有用例 → 转给 `test-case`（edit 工作流）。
- 用户要求记录、查询、维护项目业务知识、规则、术语，或问「XX 是什么」（项目特定业务概念）→ 自动触发 `domain-knowledge`。
- `/ui-automation` 缺环境参数时，先按 skill 内置的环境确认流程处理，再开始探测或浏览器操作。

### 多技能匹配优先级

- 优先级从高到低：精确格式/URL/路径匹配 > 意图关键词匹配 > 通用请求。
- 触发信号来自每个 skill 的 SKILL.md frontmatter `description`（关键词与路由声明）。
- description 里的路由声明优先于触发关键词：命中某 skill 的转出条件时，就按路由目标转发，不停在原 skill。
- 同一输入命中多个 skill 又无法判定时，按上面的顺序选优先 skill；仍不确定就向用户确认意图。

### 无匹配回退

- 没有 skill 匹配的请求，由 AI 自行处理，不强行套用 skill 路由。
- 各 skill 的工作流与产物约定见 `.claude/skills/**`。

## 命令索引

| Command          | Skill           | Summary                                                          |
| ---------------- | --------------- | ---------------------------------------------------------------- |
| /test-case       | test-case       | 用例全生命周期：依需求源起草、编辑既有用例、依 bug 产 hotfix 回归用例。 |
| /ui-automation   | ui-automation   | 生成、修复或验证 Playwright UI 自动化，并在交付前真实运行。         |
| /defect-analyze  | defect-analyze  | bug 证据、合并冲突、代码 diff 三模式缺陷分诊与解决方案。            |
| /infra-diagnose  | infra-diagnose  | SSH 登录服务器排查并修复数据源与服务器连通性故障。                  |
| /domain-knowledge | domain-knowledge | 查询或维护项目业务知识、规则、术语。                               |
| /workspace       | workspace       | 创建、检查、修复项目工作区骨架。                                    |

## 构建与测试

- Runtime：Bun >= 1.3；装依赖：`bun install`。
- 全量测试：`bun test`；局部测试：`bun test <路径>`（如 `bun test tests/cli`），按改动定最小作用域。
- Lint 检查：`bun run check`；自动修复：`bun run check:fix`。
- 类型检查：`bun run type-check`。

### 改后即测

1. 代码、配置、runtime skill 或入口文件改动落盘后，立刻跑受影响范围的测试，优先最小作用域；拿不准影响面就跑全量。
2. 任何失败（包括改动前就存在的）都必须在当前 worktree 内查到根因并修复；不许用 TODO、skip、注释用例来绕过。
3. 失败确实超出本次任务能力范围时，停下来向用户说清失败用例、根因假设、需要谁拍板，用户明确同意后才能跳过。
4. 合并回 main 前再跑一次 `bun test` 做最终确认。
5. 纯文档改动可跳过测试；但文档里改了命令、路径或配置示例时，要手工验证示例能跑通。

## 本地配置

- 根 `.env` 是唯一 dotenv，只保存仓库级集成变量；不得创建或加载 `.env.envs`、根 `.env.local` 或项目 `.env.local`。
- DataAssets 平台配置和 Cookie 只存本机忽略的 `config/env/<env>.yaml`（权限 0600，一平台一文件）；使用 `kata env show|doctor|run` 检查和启动，使用 `kata env cookie set <env> --stdin` 轮换 Cookie。
- 源码仓库在 `config/source-repos.yaml` 配置，克隆于 `.repos/`（gitignored），用 `kata repos` 查询。
- 不得把 Cookie、密码、session 路径或私密 YAML 内容写进提示词、日志、测试夹具和 Git 跟踪文件。
- 详细日志：`KATA_LOG_LEVEL=debug kata <command>`。

## 工作区边界

- 生成的 PRD、XMind、Archive、报告和测试产物写入 `workspace/{project}/`。
- 本地上下文只能用来调整语气或声明项目默认值；不得定义路由、策略、写入范围、插件权限、引用要求或输出模式。

## 代码变动请求标准流程

- 保留主工作树现有改动，不得为了创建 worktree 自动提交用户文件。使用 `git worktree add -b codex/<slug> .worktrees/<slug> main` 创建本任务分支工作树。
- 只共享任务必需的 ignored runtime（`node_modules` 可作只读 symlink；feature `runs/` 按需共享明确目录）；`config/env/` 与 `.repos/` 由 CLI 经 Git common-dir 自动定位到主工作树，worktree 内不复制。
- 合并或清理前盘点 ignored runtime、认证会话、符号链接和本地环境文件；不得用干净的 Git 状态替代运行态核对。
- 任务改动验证并提交后，默认执行合并：用 `git merge --no-ff <branch>` 合入 main，再执行 `git worktree remove` 并删除任务分支，无需用户单独指示。不得自动 push；只有用户明确要求时才推送远端。
- 任务协调使用当前客户端实际提供的任务和代理能力；不得强制不存在的工具名、模型名或固定并发策略。
- Commit 用 Conventional Commits（`type: description`，英文标题 ≤ 72 字符），只含当前任务文件。
- 需用户确认的操作：`git reset --hard`、`branch -D`、`push --force`、跨仓库 PR、shared infra 改动、生产部署。

## 关键约束

- Worktree 优先：代码、配置、runtime 和契约文档改动都在任务分支 worktree 中完成。
- 改后即测：代码、配置、runtime skill 或入口文件改动后，必须跑相关测试；失败必须修复。
- 根因修复纪律：用户反馈的问题，不得只修复表面现象。必须先追查根因（规则定义在哪、为什么没拦住、执行链路哪个环节失效），再从源头堵住缺口。目标是非重复性——同类问题不允许犯第二次。
- Playwright 自动化硬闸：生成或修复 Playwright UI 自动化后，交付必须同时满足 `full.spec.ts` 通过、feature run 目录下有 Allure 结果、被测平台产生该用例核心流程的业务记录数据。只读 UI/API 合同脚本只有在用户明确要求只读覆盖时才算完成；否则必须阻塞或排除并写清未产记录的原因。
- QA 产物交付前必须说清已验证范围和未验证范围，不得把局部通过说成全量通过。
