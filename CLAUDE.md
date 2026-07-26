# Kata 项目约定

Kata 是面向 QA 用例、自动化与工程知识的 CLI 工作区；公开命令用 `kata --help`，首次安装见 [INSTALL.md](./INSTALL.md)。

## 判断与验证

- 代码、配置、runtime skill 或入口文件改动落盘后，立即运行受影响范围的测试；拿不准影响面就跑全量。
- 失败（包括改动前已存在的失败）必须在当前 worktree 查根因并修复，不用 TODO、skip 或注释用例绕过；确实超出范围时说明失败、根因假设和待确认事项。
- 区分“已运行”“从代码确认”“尚未验证”；未执行完整范围时不得声称“全部通过”或“完整 E2E 通过”。
- 修复缺陷要覆盖原始场景；时间、网络和文件系统测试使用可控输入，不依赖真实时钟或外部状态碰巧满足。
- 公开行为、命令、目录或产物变化时，更新中英文 README 与安装说明；文档中的命令、路径或配置示例要手工核对。

## 根因与机制

- 先确认问题层次，再在最接近问题的代码、Schema、检查器或文档层修复；能由程序检查的规则必须下沉到程序。
- CLI stdout 只输出请求数据，诊断与进度写 stderr；机器模式输出稳定 JSON。库函数返回结果或抛出带代码的错误，不在库内 `process.exit()`。
- 默认使用 dry-run；改变 Git 暂存区或外部系统时提供明确开关。只改相关文件，保留稳定 ID、用户内容和无法重建的信息，不无提示覆盖。
- 配置目录说明见 `config/README.md`；运行时配置、权限和引用由 `kata config doctor` 校验。

## Git 与 worktree

- 代码、配置与文档改动在当前项目的任务 worktree 中完成；验证并提交后合并回主分支，再移除 worktree。
- Commit 信息参考历史 commit 规范。

## 安全与本地配置

- 不主动展开、回显、提交或写入日志中的 secrets；Cookie、密码、session 路径和私密 YAML 不得进入提示词、日志、测试夹具或 Git 跟踪文件。
- 真实客户项目产物放独立私有仓库或制品存储，框架仓库只保留脱敏的最小 fixture。
- 根 `.env` 是唯一 dotenv，权限为 0600；`config/env/` 权限为 0700，环境文件权限为 0600；使用 `kata env` 管理平台配置和 Cookie。
- 源码仓库由 `config/repos/sources.yaml` 声明，克隆于 `.repos/`（gitignored），用 `kata repos` 查询；`writable: false` 的仓库不得 push、commit 或 add。
- 本地私有设置不写入项目级 agent 文档，放用户级配置或 gitignored 文件；详细日志使用 `KATA_LOG_LEVEL=debug kata <command>`。

## 工作区与 Playwright 硬闸

- PRD、XMind、Archive、报告和测试产物写入 `workspace/{project}/`；本地上下文只能调整语气或声明默认值，不得定义路由、策略、写入范围、插件权限、引用要求或输出模式。
- Playwright 自动化交付必须同时满足 `full.spec.ts` 通过、feature run 目录有 Allure 结果、被测平台产生核心流程业务记录；只读脚本只有用户明确要求只读覆盖时才算完成。
- Playwright 必须通过 `kata runs exec <feature-id> --project <project> -- <command...>` 运行，结果写入显式 `runs/<run-id>/`；缺少 `KATA_RUN_PATH` 直接失败，仓库内禁止 `.runs/`。
- 交付前必须运行 `kata automation lint <featureDir> --exit-code`，并对共享页面、helper 和 fixture 运行 `kata automation lint --shared --exit-code`；所有违规必须在交付前修复。
- QA 产物交付必须明确已验证和未验证范围，不得把局部通过说成全量通过。
