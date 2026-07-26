# Kata 安装指南

## 前置依赖

| 工具 | 最低版本 | 检查命令 |
| --- | --- | --- |
| Node.js | `22` | `node --version` |
| Bun | 项目锁文件兼容版本 | `bun --version` |
| Git | 任意受支持版本 | `git --version` |

Claude Code 与 Codex 至少安装一种。只有执行真实浏览器测试时才需要 Playwright 浏览器。

## 安装步骤

```bash
# 1. 安装锁文件声明的依赖
bun install --frozen-lockfile

# 2. 检查工作区
kata project scan --project dataAssets

# 3. 运行仓库检查
bun run ci

# 4. 需要 UI 自动化时安装浏览器
bunx playwright install
```

项目不再使用根目录 `config.json`。不要从旧的 `config.example.json` 创建第二套配置。

## DataAssets 环境

每个平台使用一个本机私密文件：`config/env/<env>.yaml`。先创建目录并收紧权限：

```bash
mkdir -p config/env
chmod 700 config/env
kata env add ci63 --url https://platform.example
chmod 600 config/env/ci63.yaml
```

补全稳定项目名、数据源名、租户和写入开关后，从标准输入写入 Cookie：

```bash
printf '%s' "$COOKIE" | kata env cookie set ci63 --stdin
kata env doctor ci63 --offline
kata env doctor ci63
```

平台只能提供 HTTP 时，`doctor` 会给出传输风险提示。共享或生产环境应使用 HTTPS。

## 基础设施配置

复制并填写 `config/infra/hosts.example.yaml`、`data_sources.example.yaml` 和 `credentials.example.yaml` 到对应的本机私密文件。真实密码、host fingerprint 和连接信息不得提交：

```bash
mkdir -p config/infra
chmod 700 config/infra
kata config doctor
kata infra credentials set <name> --username <username>
kata infra trust-host <host> --fingerprint <SHA256-fingerprint>
kata infra inspect <host> --check connectivity --project <project>
```

`kata infra inspect` 当前只执行 SSH2 connectivity 检查并生成脱敏 Markdown 报告，不执行服务器变更。

运行依赖该环境的 Playwright 命令必须绑定到正式 run：

```bash
kata runs exec <feature-id> --project dataAssets -- kata env run ci63 -- bunx playwright test <spec>
```

`kata runs exec` 会创建 `workspace/<project>/features/<feature>/runs/<run-id>/`，并注入 `KATA_RUN_PATH` 与 `KATA_ALLURE_RESULTS_DIR`。没有显式 run 路径时 Playwright 直接失败；仓库内不使用 `.runs/`。

子命令默认不会继承根进程中的全部变量。确实需要额外变量时显式加入：

```bash
kata env run ci63 --inherit-env HTTP_PROXY,NO_PROXY -- bunx playwright test
```

## 插件配置

插件配置按用途写入本机 ignored YAML：

```bash
mkdir -p config/plugin
cp config/plugin/lanhu.example.yaml config/plugin/lanhu.yaml
cp config/plugin/zentao.example.yaml config/plugin/zentao.yaml
cp config/plugin/notify.example.yaml config/plugin/notify.yaml
chmod 700 config/plugin
chmod 600 config/plugin/*.yaml
```

Lanhu 和 ZenTao 刷新后的 Cookie 会原子写回对应 YAML。旧根 `.env` 可以用 `kata config plugins-migrate` 预览并迁移插件字段；数据库 URL、旧 DTStack session 路径和未知字段不会被迁移。仓库不再自动加载根 `.env`。

不要提交 `config/plugin/*.yaml`、`config/env/*.yaml`、`config/infra/*.yaml`、会话文件或命令输出中的凭据。真实凭据一旦出现在聊天、日志或提交历史中，应在对应服务端立即轮换；删除本地文件不能使已经发出的令牌失效。

## 源码仓库

源码仓库配置只保存在本机忽略文件 `config/repos/sources.yaml`；首次使用请复制脱敏模板 `config/repos/sources.example.yaml` 后填写，实体克隆在 `.repos/`（gitignored，仓库太大不入库）。把仓库克隆到配置的相对路径后，用 `kata repos list` 确认就位：

```bash
git clone <remote-url> .repos/<group>/<repo>
kata repos list
```

PowerShell 等价步骤：

```powershell
New-Item -ItemType Directory -Force config/env | Out-Null
kata project scan --project dataAssets
kata env add ci63 --url https://platform.example
```

用 `kata repos show|grep` 只读查询，`kata repos pull|checkout` 更新或切换分支；`writable: false` 的仓库不可 push、commit、add。

## 完成检查

```bash
bun run check
bun run type-check
bun run test
```

全部命令退出码为 `0` 后，再提交代码。任何未运行范围都应在提交说明中明确写出。
