<p align="center">
  <strong>把需求、用例、自动化与证据，串成一条可复核的 QA 工程流水线。</strong>
</p>

<p align="center">
  <a href="./README-EN.md">English</a> ·
  <a href="./INSTALL.md">安装指南</a> ·
  <a href="./config/README.md">配置说明</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 22 or newer" />
  <img src="https://img.shields.io/badge/Bun-required-000000?style=flat-square&logo=bun&logoColor=white" alt="Bun required" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="MIT License" />
</p>

# Kata

Kata 是面向 Claude Code 与 OpenAI Codex 的 QA 工作区。它把需求分析、测试用例、缺陷分诊、Playwright 自动化、基础设施诊断和项目知识组织成可复用的 Skill 与 CLI，产物写入固定目录，运行记录全程可复核。

## 一眼看懂

```text
需求 / 设计稿 ───────> 需求拆解 ───────> 用例与知识
已有用例 / 缺陷 ─────> 标准化与分诊 ────> 可执行的修复建议
用例 / 失败结果 ─────> Playwright ─────> 运行记录、截图与报告
服务器 / 数据源 ────> 受控诊断 ───────> 脱敏的连通性结论
```

这条链路的关键不是“生成更多文本”，而是让每个结果都能追溯到输入、命令和证据：

- Skill 正文的唯一来源是 `.claude/skills/`；`.agents/skills/` 只提供 Codex 侧的 symlink。
- 通用 CLI 位于 `cli/`，两套运行环境复用相同实现。
- 项目输入、用例、自动化和运行产物写入 `workspace/{project}/`。
- 平台 Cookie、插件凭据、基础设施凭据和数据源信息只保存在本机被 Git 忽略的配置中，不进入版本库。

## 能力地图

| 入口 | 适合的问题 | 主要产物 |
| --- | --- | --- |
| `/test-case` | 从 PRD、设计稿等需求来源编写、编辑和同步用例 | YAML / XMind / 可追溯的 SourceRef |
| `/ui-automation` | 把既有 feature 用例变成真实 Playwright 自动化 | spec、run 目录、Allure 与截图 |
| `/defect-analyze` | 分析堆栈、HTTP 失败、冲突或代码差异 | 根因、影响面与修复建议 |
| `/infra-diagnose` | 检查服务器或数据源的 SSH2 连通性 | 脱敏 Markdown 诊断报告 |
| `/domain-knowledge` | 查询或维护项目业务规则和术语 | 可复用的领域知识 |
| `/workspace-management` | 创建、修复和检查 Kata 工作区 | 标准化的工作区骨架 |

## 快速开始

### 前置条件

- Node.js `>= 22.0.0`
- Bun
- Git
- Claude Code 或 OpenAI Codex 至少一种

### 安装

```bash
bun install --frozen-lockfile
bun link   # 把 kata 命令链接到 Bun 全局 bin 目录
bun run ci
```

只有运行真实浏览器测试时才需要安装 Playwright 浏览器：

```bash
bunx playwright install
```

### 创建本机配置

Kata 不再自动加载根目录的 `.env`。配置按用途分目录存放，模板只提供字段和占位值：

```bash
# DataAssets 平台 URL 与 Cookie
kata env add ci63 --url https://platform.example
printf '%s' "$COOKIE" | kata env cookie set ci63 --stdin
kata env doctor ci63 --offline

# 插件配置：从模板复制后只在本机填写
cp config/plugin/lanhu.example.yaml config/plugin/lanhu.yaml
cp config/plugin/zentao.example.yaml config/plugin/zentao.yaml
cp config/plugin/notify.example.yaml config/plugin/notify.yaml

# 基础设施配置：只在本机填写
cp config/infra/hosts.example.yaml config/infra/hosts.yaml
cp config/infra/data_sources.example.yaml config/infra/data_sources.yaml
cp config/infra/credentials.example.yaml config/infra/credentials.yaml
kata config doctor
```

如果旧版本还留着根目录的 `.env`，可以先预览再执行插件字段迁移：

```bash
kata config plugins-migrate --source /path/to/old.env --root /path/to/kata
kata config plugins-migrate --source /path/to/old.env --root /path/to/kata --apply
```

迁移命令只处理插件字段；数据库 URL、DTStack 旧 session 路径和其他未知字段不会写入插件 YAML。

## 配置边界

| 目录 | 内容 | 是否提交 |
| --- | --- | --- |
| `config/env/` | DataAssets 平台 URL、`auth.cookie`、环境元数据 | 仅 `*.example.yaml` 入库，实际配置本机自管 |
| `config/plugin/` | Lanhu、ZenTao、DingTalk / Feishu / WeCom / SMTP | 仅 `*.example.yaml` 入库，实际配置本机自管 |
| `config/infra/` | 主机、数据源、凭据 profile、SSH fingerprint | 仅 `*.example.yaml` 入库，实际配置本机自管 |
| `config/repos/` | 外部源码仓库声明 | 仅 `sources.example.yaml` 入库，`sources.yaml` 本机自管 |

`config/env/<env>.yaml` 是 Playwright 与 DTStack 平台访问的统一来源：URL 放在 `url`，Cookie 放在 `auth.cookie`。不再维护独立的 DTStack session 文件或旧的持久化变量。临时覆盖或 CI 覆盖仍可通过显式环境变量传入。

本机目录和文件应收紧权限：

```bash
chmod 700 config/env config/plugin config/infra
chmod 600 config/env/*.yaml config/plugin/*.yaml config/infra/*.yaml
```

基础设施诊断按连接类型使用默认 profile：服务器使用 `server-default`，数据源使用 `data-source-default`；用户配置的 `credential_ref` 优先。默认凭据只写在本机的 `config/infra/credentials.yaml` 中；连接失败时立即返回脱敏后的错误，不会交叉尝试另一类凭据，也不执行任意远程命令。

## 真实自动化运行

Playwright 必须绑定到显式 run，不能直接在仓库内留下 `.runs/`：

```bash
kata runs exec <feature-id> --project dataAssets -- \
  kata env run ci63 -- bunx playwright test <spec>
```

交付前运行：

```bash
kata automation lint <feature-dir> --exit-code
kata automation lint --shared --project dataAssets --exit-code
kata runs verify --project dataAssets --feature <feature-dir>
```

只有脚本真实执行、断言通过、Allure 结果落盘，并且被测平台产生了预期的业务记录，才能把 UI 自动化标记为通过。

## 项目结构

```text
kata/
├── .claude/skills/       # Skill 正文唯一来源
├── .agents/skills/       # Codex 侧 symlink
├── .codex-plugin/        # Codex 插件清单
├── cli/                  # kata CLI 与集成实现
├── config/               # example 模板与本机私密配置边界
├── lib/                  # 共享库（db 连接串、Playwright 支撑）
├── tests/                # CLI、集成与 Skill 测试
└── workspace/            # 项目输入、用例、run 与报告
```

Skill 的产物写入对应的 feature 目录。运行目录 `runs/<run-id>/` 由 CLI 写入 `status.json` 与 `allure-results/`，流程产生的截图、日志和 `handoff.md` 也放在同一目录；未运行的范围不得写成通过。

## 开发与验证

```bash
bun install --frozen-lockfile
bun run check
bun run type-check
bun test
bun run ci
```

公开命令、目录或产物变化时，请同步更新 [README-EN.md](./README-EN.md) 与 [INSTALL.md](./INSTALL.md)。

## License

MIT
