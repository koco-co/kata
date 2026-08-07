# 安装与引导指南

## 1. 角色

你是一个本地安装助手，任务是：

1. 检查并安装前置依赖（Node.js、Bun、Git，以及 Claude Code 或 Codex 至少一种）。
2. 安装依赖并链接 `kata` 命令。
3. 引导用户获取各平台配置（如 ZenTao Cookie、平台 URL、凭据），并写入 `config/private/` 下对应文件。
4. 全程不得将任何凭据或密钥写入聊天记录、日志或提交。
5. 完成基础配置后，引导用户在 `workspace/` 下初始化一个项目，并走完一次 `test-case` skill 流程（推荐）。
6. 其余 skill 流程由用户决定是否继续；若不继续，结束本次本地引导任务。

## 2. 前置依赖

| 工具 | 最低版本 | 检查命令 |
| --- | --- | --- |
| Node.js | `22` | `node --version` |
| Bun | `>= 1.3` | `bun --version` |
| Git | 任意受支持版本 | `git --version` |

Claude Code 与 Codex 至少安装一种。只有执行真实浏览器测试时才需要 Playwright 浏览器。

## 3. 安装依赖

安装依赖并链接命令：

```bash
bun install --frozen-lockfile
bun link   # 把 kata 命令链接到 Bun 全局 bin 目录
bun run ci
```

`bun link` 把 `kata` 注册到 Bun 全局 bin 目录（通常 `~/.bun/bin`），需确认该目录已在 `PATH` 中；不执行 `bun link` 时 `kata` 不在 `PATH` 上，可改用 `bun run cli/bin/kata.ts <command>` 直接调用。

### 使用 TUI

安装完成后，人类用户可直接进入交互界面：

```bash
kata
kata tui
```

脚本、CI 或模型调用保持纯 CLI，使用 `--no-interactive` 强制跳过 TUI；例如 `kata --no-interactive cases build <requirementId> --format xmind`。TUI 入口契约和开放范围见 `docs/kata-tui-architecture.md`。

Windows 克隆必须启用符号链接（`git config --global core.symlinks true`，并在开启开发者模式或管理员权限的终端中克隆），否则 `.agents/skills/` 的 symlink 会退化为普通文本文件，Codex 侧无法加载 Skill。

## 4. 平台环境

每个平台使用一个本机私密文件：`config/private/environments/<env>.yaml`。先创建目录并收紧权限：

```bash
mkdir -p config/private/environments
chmod 700 config/private/environments
kata env add ci63 --url https://platform.example
chmod 600 config/private/environments/ci63.yaml
```

补全稳定项目名、数据源名、租户和写入开关后，从标准输入写入 Cookie：

```bash
printf '%s' "$COOKIE" | kata env cookie set ci63 --stdin
kata env doctor ci63 --offline
kata env doctor ci63
```

## 5. 基础设施配置

复制并填写 `config/examples/infrastructure/` 下的 `hosts.example.yaml`、`data_sources.example.yaml` 和 `credentials.example.yaml` 到 `config/private/infrastructure/` 对应的本机私密文件。真实密码、host fingerprint 和连接信息不得提交：

```bash
mkdir -p config/private/infrastructure
chmod 700 config/private/infrastructure
kata config doctor
kata infra credentials set <name> --username <username>
kata infra trust-host <host> --fingerprint <SHA256-fingerprint>
kata infra inspect <host> --check connectivity --project <project>
```

`kata infra inspect` 当前只执行 SSH2 connectivity 检查并生成脱敏 Markdown 报告，不执行服务器变更。

## 6. 插件配置

插件配置按用途写入本机 ignored YAML：

```bash
mkdir -p config/private/integrations
cp config/examples/integrations/lanhu.example.yaml config/private/integrations/lanhu.yaml
cp config/examples/integrations/zentao.example.yaml config/private/integrations/zentao.yaml
cp config/examples/integrations/notify.example.yaml config/private/integrations/notify.yaml
chmod 700 config/private/integrations
chmod 600 config/private/integrations/*.yaml
```

Lanhu 和 ZenTao 刷新后的 Cookie 会原子写回对应 YAML。仓库不自动加载根 `.env`，也不提供旧 dotenv 迁移命令；旧 `.env` 中的字段需要手动填回新布局的私密文件。

## 7. 源码仓库

源码仓库目录 `config/private/repositories.yaml` 是本机不跟踪的私密配置（只有脱敏模板 `config/examples/repositories.example.yaml` 入库）；首次使用请复制模板后填写，实体克隆在 `.repos/`（gitignored，仓库太大不入库）。把仓库克隆到配置的相对路径后，用 `kata repos list` 确认就位：

```bash
git clone <remote-url> .repos/<group>/<repo>
kata repos list
```

每个仓库还必须显式填写适用的 `modules` 与 `customers`；公共仓库使用 `"*"`，不能省略。
生成 PRD 前用以下命令只准备与当前需求匹配的 release 分支：

```bash
kata repos prepare --project dataAssets --module 数据标准 --customer 标品
```

PowerShell 等价步骤（本文其余示例为 bash 语法，管道与重定向在 PowerShell 中需相应改写）：

```powershell
New-Item -ItemType Directory -Force config/private/environments | Out-Null
kata project scan --project dataAssets
kata env add ci63 --url https://platform.example
```

用 `kata repos show|grep` 只读查询，`kata repos pull|checkout` 更新或切换分支；`writable: false` 的仓库不可 push、commit、add。

## 8. 运行依赖的 Playwright

运行依赖该环境的 Playwright 命令必须绑定到正式 run：

```bash
kata runs exec <feature-path> --project dataAssets -- kata env run ci63 -- bunx playwright test <spec>
```

`kata runs exec` 会创建 `workspace/<project>/features/<feature>/runs/<run-id>/`，并注入 `KATA_RUN_PATH`。Playwright 的公共配置来自 `config/automation/playwright.yaml`；Allure 原始结果和 HTML 报告直接生成在该 run 目录下。没有显式 run 路径时 Playwright 直接失败；仓库内不使用 `.runs/`。

子命令默认不会继承根进程中的全部变量。确实需要额外变量时显式加入：

```bash
kata env run ci63 --inherit-env HTTP_PROXY,NO_PROXY -- bunx playwright test
```

## 9. 完成检查

```bash
bun run check
bun run type-check
bun run test
```

全部命令退出码为 `0` 后，再提交代码。任何未运行范围都应在提交说明中明确写出。

`bun install` 会自动启用仓库级 `pre-push` 钩子（`.githooks/pre-push`）；该钩子会在 `git push` 前运行 `bun run pre-push`，与 GitHub Actions 执行同一套完整项目校验（仓库策略、全量用例 lint、config docs、knowledge lint、Biome、TypeScript 与全部测试）。若本地仓库未自动配置，可手动执行：

```bash
bun run setup-hooks
bun run pre-push
```

## 10. 首次项目引导

基础配置完成后，引导用户在 `workspace/` 下初始化一个项目：

1. 使用 `kata project scan --project <name>` 扫描或创建项目目录。
2. 走完一次 `/test-case` skill 流程：从 PRD、设计稿等需求来源编写、编辑和同步用例，产出 YAML / XMind / SourceRef。
3. 其余 skill（`/ui-automation`、`/defect-analyze`、`/infra-diagnose`、`/domain-knowledge`、`/workspace-management`）由用户决定是否继续；若不继续，结束本次本地引导任务。
