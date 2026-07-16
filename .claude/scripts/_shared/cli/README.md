# kata CLI 约定

`kata` 是项目唯一的公共命令入口。公共命令统一写成 `kata <资源> <动作>`；脚本文件名、旧命令和内部工具不直接出现在根帮助页。

## 命名

- 资源和动作使用小写英文单词，以连字符连接，不使用冒号。
- 动作使用完整单词，例如 `create`、`list`、`sync`，不使用 `new`、`ls` 等缩写。
- 位置参数使用 kebab-case，例如 `<feature-id>`、`<feature-dir>`。
- 选项使用 kebab-case；存在固定取值时必须声明 choices，让 `--help` 列出可选值并在执行前拦截无效输入。
- 已发布的旧命令可以保留为隐藏兼容入口，但 Skill、共享提示词和帮助文档只能引用公共命令。新增或改名时必须同时更新调用方与测试，不允许文档先写、CLI 后补，也不允许 CLI 改名后遗留旧引用。

## 帮助

每一层都必须支持 `--help`：

```text
kata --help
kata <资源> --help
kata <资源> <动作> --help
```

描述用简洁中文说明“命令做什么”；参数说明写清是否必填、默认值、可选值，以及是否会修改文件。命令树由 `tests/cli/public-command-contract.test.ts` 固定。该测试还会扫描 Skill 与共享提示词，禁止隐藏旧命令和 camelCase 位置参数；新增、删除或改名时必须同时更新 CLI、相关文档与契约测试。

## 输入与输出

- 数据型输出通过 `outputJson()` 写入 stdout；一次只输出一个合法 JSON 值。
- 面向人的结果通过 `console.log()` 写入 stdout。
- 警告、诊断和错误写入 stderr，不得污染 JSON stdout。
- 禁止遗留调试输出；`tests/cli/output-style.test.ts` 自动检查上述规则。

## 环境配置

- 根 `.env` 是唯一 dotenv。公共 CLI 入口禁用 Bun 的隐式 dotenv 加载，`initEnv()` 只补齐根 `.env` 中尚未由调用进程显式设置的键。
- 不支持 `.env.envs`、根 `.env.local` 或项目 `.env.local`；用 `kata env migrate-local --project <name>` 预览迁移，确认后加 `--apply`。
- DataAssets 环境以一个忽略的 `config/env/<env>.yaml` 保存平台根 URL、稳定名称、租户保护、写入开关与 `auth.cookie`；目录 `0700`、文件 `0600`。
- `kata env show <env>` 始终脱敏，`kata env doctor <env>` 检查本地安全与在线精确解析，`kata env run <env> -- <command...>` 注入不含 Cookie 的解析结果；所有命令不得输出 secret 值。

## 用例格式转换

单份用例文件统一通过下列公共命令转换：

```text
kata cases convert --input <file> --to <md|xlsx|csv|xmind|json> [--output <file>]
```

- 输入格式根据扩展名自动识别；省略 `--output` 时在原目录生成同名目标扩展名文件。
- 默认拒绝覆盖已有文件，只有显式传入 `--force` 才覆盖。
- XLSX/CSV 使用稳定的逐步骤表格协议，`case_no` 标识用例，`step_no` 标识步骤；同时兼容常见中文用例表头。
- XMind 单文件转换只接受一个需求根节点；包含多个需求的历史 XMind 使用 `kata history convert` 拆分。

## 退出码

- `0`：命令执行成功，或检查未发现阻断项。
- `1`：输入无效、执行失败或发生未处理错误。
- `2`：命令正常完成检查，但发现阻断项、冲突或仍需处理的输入。

退出码只说明命令状态；详细原因必须同时写入 stderr 或结构化结果。

## 代码位置

- 入口：`../bin/kata`
- 公共命令组：本目录和各 Skill 的 `scripts/`
- 公共命令契约：`../tests/cli/public-command-contract.test.ts`
- 共享输出函数：`../lib/cli.ts`
- 共享 Commander 构建器：`../lib/cli-runner.ts`
