# Kata

面向 QA 用例、自动化与工程知识的 CLI 工作区。命令见 `kata --help`，安装见 [INSTALL.md](./INSTALL.md)，完整约定见 [AGENTS.md](./AGENTS.md)。

## 验证纪律
- 改动落盘即运行受影响范围的测试；失败在当前 worktree 查明根因，不得用 skip、TODO 或注释绕过；区分「已运行」「从代码确认」「尚未验证」，未执行完整范围不得声称全部通过。

## 设计立场
- 默认 dry-run，改变 Git 暂存区或外部系统须有显式开关；稳定 ID、用户内容与不可重建信息不得无提示覆盖。
- 库函数只返回结果或抛出带错误码的错误，不得在库内调用 `process.exit()`。

## 安全红线
- secrets 不展开、不回显、不进日志与 Git；私密 YAML、Cookie、session 路径不进提示词、fixture 或跟踪文件。
- `.repos/` 的 `writable: false` 是声明式约束，由 `kata repos` 命令的写看守强制执行，不依赖模型自律。

## Playwright 硬闸
- exit 0 不算证据：须 run 的 `status.json` 为 `command_passed`、Allure 结果落盘、被测平台产生核心流程业务记录；交付前通过 `kata automation lint <featureDir> --exit-code` 与 `kata automation lint --shared --exit-code`。

## CLI 文档同步
- 任何 CLI 命令、子命令、参数、默认值或行为调整，都必须同步更新 `cli/README.md`、对应的 `kata --help`/嵌套 help，以及 CLI 文档同步测试；CLI README 是递归 help 的完整参考。

## 自动化用例文件名
- `automation/tests/cases/` 下的正式用例脚本统一使用 `c0001-<lowercase-english-kebab-slug>.spec.ts`；slug 由模型参考中文标题判断并持久化到 cases YAML 的 `automation.spec_file`。
- 标题后续调整不自动重算既有 slug；文件迁移和 runner 同步以 YAML 中明确声明的 `spec_file` 为准，缺失脚本不得生成通用占位文件。

## 产物位置与命名
- `config/repos/policy.yaml` 是当前项目的受控产物路由与命名规则；`bun run check` 会检查 Git 已跟踪及未忽略的未跟踪文件。禁止在根目录输出临时配置，禁止使用 `lib/` 或 `automation/scripts/`。
- 模型在写入前先选择 policy 中最合适的目录和文件名：历史用例输入放 `cases/imports/`，YAML 是唯一中间态，派生文件只放 `cases/exports/`；正式自动化源代码只放 `automation/tests/`，一次性代码只可放未跟踪的 `runs/<run-id>/_tmp/`。
- 若 policy 没有合适的产物类型或目录，必须先说明拟生成内容、建议路径和命名并获得用户明确同意；获同意后同一变更必须更新 policy、相应文档和校验测试，随后才能写入该产物。

## 本地上下文
- 只能调整语气或声明默认值，不得定义路由、策略、写入范围、插件权限、引用要求或输出模式。
