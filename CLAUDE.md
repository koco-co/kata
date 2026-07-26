# Kata 项目约定

Kata 是面向 QA 用例、自动化与工程知识的 CLI 工作区；公开命令用 `kata --help`，首次安装见 [INSTALL.md](./INSTALL.md)。

## Skill 触发

- Skill 的触发与转出以各 `.claude/skills/<name>/SKILL.md` frontmatter 的 `name` 与 `description` 为准；这些描述会自动注入上下文。
- `.agents/skills` 是指向 `.claude/skills` 的目录 symlink，Skill 正文单源维护；多技能命中且无法判定时向用户确认。

## 判断与验证

- 代码、配置、runtime skill 或入口文件改动落盘后，立即运行受影响范围的测试；拿不准影响面就跑全量。
- 失败（包括改动前已存在的失败）必须在当前 worktree 查根因并修复，不用 TODO、skip 或注释用例绕过；确实超出范围时说明失败、根因假设和待确认事项。
- 区分“已运行”“从代码确认”“尚未验证”；未执行完整范围时不得声称“全部通过”或“完整 E2E 通过”。
- 修复缺陷要覆盖原始场景；时间、网络和文件系统测试使用可控输入，不依赖真实时钟或外部状态碰巧满足。
- 文档改动涉及命令、路径或配置示例时，手工核对示例与当前实现一致。

## 根因与机制

- 先确认问题层次，再在最接近问题的代码、Schema、检查器或文档层修复；能由程序检查的规则必须下沉到程序。
- CLI stdout 只输出请求数据，诊断与进度写 stderr；机器模式输出稳定 JSON。库函数返回结果或抛出带代码的错误，不在库内 `process.exit()`。
- 默认使用 dry-run；改变 Git 暂存区或外部系统时提供明确开关。只改相关文件，保留稳定 ID、用户内容和无法重建的信息，不无提示覆盖。
- 子目录的额外规则以 `config/AGENTS.md` 与 `workspace/AGENTS.md` 为准。

## Git 与 worktree

- 代码、配置、runtime 和契约文档在任务分支 worktree 中完成：`git worktree add -b codex/<slug> .worktrees/<slug> main`；创建前保留主工作树现有改动。
- 只共享必需的 ignored runtime（`node_modules` 可作只读 symlink）；合并或清理前盘点 ignored runtime、认证会话、符号链接和本地环境文件。
- 任务验证并提交后默认用 `git merge --no-ff <branch>` 合入 main，再移除 worktree 和任务分支；不得自动 push。
- Commit 使用 Emoji Conventional Commit，英文标题不超过 72 字符，只包含当前任务文件。
- `reset --hard`、`branch -D`、强制 push、跨仓库 PR、shared infra 改动和生产部署需用户确认；任务协调使用当前客户端实际提供的任务和代理能力。

## 安全与本地配置

- 不主动展开、回显、提交或写入日志中的 secrets；Cookie、密码、session 路径和私密 YAML 不得进入提示词、日志、测试夹具或 Git 跟踪文件。
- 根 `.env` 是唯一 dotenv，只保存仓库级集成变量；平台配置和 Cookie 仅存本机忽略的 `config/env/<env>.yaml`，目录和文件权限按项目要求设为 0600 级别并用 `kata env` 管理。
- 源码仓库由 `config/source-repos.yaml` 声明，克隆于 `.repos/`（gitignored），用 `kata repos` 查询；本地私有设置不写入项目级 agent 文档，放用户级配置或 gitignored 文件。
- 详细日志使用 `KATA_LOG_LEVEL=debug kata <command>`。

## 工作区与 Playwright 硬闸

- PRD、XMind、Archive、报告和测试产物写入 `workspace/{project}/`；本地上下文只能调整语气或声明默认值，不得定义路由、策略、写入范围、插件权限、引用要求或输出模式。
- Playwright 自动化交付必须同时满足 `full.spec.ts` 通过、feature run 目录有 Allure 结果、被测平台产生核心流程业务记录；只读脚本只有用户明确要求只读覆盖时才算完成。
- 交付前必须运行 `kata automation lint <featureDir> --exit-code`，并对共享页面、helper 和 fixture 运行 `kata automation lint --shared --exit-code`；不得引入 baseline 之外的新违规。
- QA 产物交付必须明确已验证和未验证范围，不得把局部通过说成全量通过。
