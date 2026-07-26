# Kata 项目约定

Kata 是面向 QA 用例、自动化与工程知识的 CLI 工作区；公开命令可用 `kata --help` 查看，首次安装见 [INSTALL.md](./INSTALL.md)。

## 判断与验证

- 代码、配置、runtime skill 或入口文件的改动落盘后，立即运行受影响范围的测试；拿不准影响面时，就运行全量测试。
- 测试失败（包括改动前就已存在的失败）必须在当前 worktree 查明根因并修复，不得用 TODO、skip 或注释掉用例的方式绕过；如果确实超出本次任务范围，要说明失败现象、根因假设和待确认事项。
- 严格区分「已运行」「从代码确认」「尚未验证」三种状态；没有执行完整范围的测试时，不得声称「全部通过」或「完整 E2E 通过」。
- 修复缺陷必须覆盖原始场景；涉及时间、网络和文件系统的测试要使用可控输入，不依赖真实时钟或碰巧满足的外部状态，避免结果随环境波动。
- 公开行为、命令、目录或产物发生变化时，要同步更新中英文 README 与安装说明；文档中的命令、路径或配置示例必须逐一手工核对。

## 根因与机制

- 先确认问题发生在哪一层，再在最接近问题的代码、Schema、检查器或文档层修复；凡是能由程序自动检查的规则，都必须落实为程序检查，而不是依赖口头约定。
- CLI 的 stdout 只输出请求的数据，诊断与进度信息写入 stderr；机器模式输出稳定的 JSON。库函数要么返回结果，要么抛出带错误码的错误，不得在库内调用 `process.exit()`。
- 默认使用 dry-run，避免误操作直接产生不可逆的副作用；需要改变 Git 暂存区或外部系统时，必须提供明确的开关。只修改与任务相关的文件；稳定 ID、用户内容和无法重建的信息都要保留，不得在没有提示的情况下覆盖。
- 配置目录的说明见 `config/README.md`；运行时配置、权限和引用由 `kata config doctor` 校验。

## Git 与 worktree

- 代码、配置与文档的改动都在当前项目的任务 worktree 中完成；验证并提交后合并回主分支，再移除 worktree。
- Commit 信息参考仓库历史 commit 的既有写法。

## 安全与本地配置

- 不主动展开、回显或提交 secrets，也不把 secrets 写进日志；Cookie、密码、session 路径和私密 YAML 不得出现在提示词、日志、fixture 或 Git 跟踪文件中。
- 真实客户项目的产物放在独立的私有仓库或制品存储中，框架仓库只保留脱敏后的最小 fixture。
- `config/env/`、`config/plugin/` 和 `config/infra/` 是本机私密配置目录，目录权限为 0700，其中的 YAML 文件权限为 0600；平台配置和 Cookie 使用 `kata env` 管理。仓库不会自动加载根目录的 `.env`。
- 源码仓库由 `config/repos/sources.yaml` 声明，克隆到 `.repos/`（gitignored），用 `kata repos` 查询；标记为 `writable: false` 的仓库不得执行 push、commit 或 add。
- 本地私有设置不写进项目级 agent 文档，放在用户级配置或 gitignored 文件中；需要详细日志时，使用 `KATA_LOG_LEVEL=debug kata <command>`。

## 工作区与 Playwright 硬闸

- PRD、XMind、Archive、报告和测试产物都写入 `workspace/{project}/`；本地上下文只能调整语气或声明默认值，不得定义路由、策略、写入范围、插件权限、引用要求或输出模式。
- Playwright 自动化交付必须同时满足三个条件：`full.spec.ts` 通过、feature run 目录中有 Allure 结果、被测平台产生了核心流程业务记录；只读脚本只有在用户明确要求只读覆盖时才算完成。
- Playwright 必须通过 `kata runs exec <feature-id> --project <project> -- <command...>` 运行，结果写入显式指定的 `runs/<run-id>/`；缺少 `KATA_RUN_PATH` 时直接失败，仓库内禁止出现 `.runs/`。
- 交付前必须运行 `kata automation lint <featureDir> --exit-code`，并针对共享页面、helper 和 fixture 运行 `kata automation lint --shared --exit-code`；所有违规必须在交付前修复。
- 交付 QA 产物时必须明确说明已验证和未验证的范围，不得把局部通过说成全量通过。
