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
# 平台 URL 与 Cookie
kata env add ci63 --url https://platform.example
printf '%s' "$COOKIE" | kata env cookie set ci63 --stdin
kata env doctor ci63 --offline

# 插件配置：从模板复制后只在本机填写
cp config/examples/integrations/lanhu.example.yaml config/private/integrations/lanhu.yaml
cp config/examples/integrations/zentao.example.yaml config/private/integrations/zentao.yaml
cp config/examples/integrations/notify.example.yaml config/private/integrations/notify.yaml

# 基础设施配置：只在本机填写
cp config/examples/infrastructure/hosts.example.yaml config/private/infrastructure/hosts.yaml
cp config/examples/infrastructure/data_sources.example.yaml config/private/infrastructure/data_sources.yaml
cp config/examples/infrastructure/credentials.example.yaml config/private/infrastructure/credentials.yaml
kata config doctor
```

通知只会由成功的业务命令自动创建；`enabled_events: []`（或缺失）不会发送。需要先在本机
`config/private/integrations/notify.yaml` 明确填写事件白名单，再用 `kata notify preview` 校验展示内容；
`kata notify list/show/retry` 只操作项目本地的通知账本，不接受任意自定义发送内容。

## 配置边界

| 目录 | 内容 | 是否提交 |
| --- | --- | --- |
| `config/policies/` | 产物路由、lint、SQL 方言、XMind 映射契约 | 全部入库 |
| `config/private/` | 环境、集成、基础设施、源码仓库的私密配置 | 整个目录 gitignored |
| `config/examples/` | 私密配置的脱敏模板（镜像 `private/` 结构） | 全部入库 |
| `config/automation/` | Playwright 运行时行为设置 | 入库 |

`config/private/repositories.yaml` 的每个仓库必须声明 release `branch` 以及适用的 `modules`、`customers`。
`kata repos prepare` 只更新与当前需求项目、模块、客户明确匹配的仓库。

`config/private/environments/<env>.yaml` 是 Playwright 与 DTStack 平台访问的统一来源：URL 放在 `url`，Cookie 放在 `auth.cookie`。不再维护独立的 DTStack session 文件或旧的持久化变量。临时覆盖或 CI 覆盖仍可通过显式环境变量传入。

本机目录和文件应收紧权限：

```bash
chmod 700 config/private/environments config/private/integrations config/private/infrastructure
chmod 600 config/private/environments/*.yaml config/private/integrations/*.yaml config/private/infrastructure/*.yaml
```

基础设施诊断按连接类型使用默认 profile：服务器使用 `server-default`，数据源使用 `data-source-default`；用户配置的 `credential_ref` 优先。默认凭据只写在本机的 `config/private/infrastructure/credentials.yaml` 中；连接失败时立即返回脱敏后的错误，不会交叉尝试另一类凭据，也不执行任意远程命令。

## 用例文件流

历史用例只进入 `cases/imports/`，可编辑的唯一中间态是 `cases/<用例集>.yaml`，所有 CSV、XLSX、Markdown 和 XMind 派生产物只由 `kata cases build` 写入 `cases/exports/`。元数据记录具体文件名，而不是笼统格式：

```yaml
meta:
  imports:
    - 数据质量.csv
  exports:
    - 数据质量.xmind
    - 数据质量.md
```

`imports` 和 `exports` 均相对于各自目录；构建仅保留 YAML 已声明的派生文件。省略 `exports` 时默认生成与 YAML 同名的 `.xmind`。
`kata cases lint --project <项目>` 会校验每个已声明的历史输入实际存在于 `cases/imports/`。

## 真实自动化运行

Playwright 必须绑定到显式 run，不能直接在仓库内留下 `.runs/`：

```bash
kata runs exec <版本目录/需求目录名> --project dataAssets -- \
  kata env run ci63 -- bunx playwright test <spec>
```

交付前运行：

```bash
kata automation lint <feature-dir> --exit-code
kata automation lint --all-features --project dataAssets --exit-code
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
├── runtime/              # 可复用的数据库、Playwright 与 runner 支撑
├── tests/                # CLI、集成与 Skill 测试
└── workspace/            # 项目输入、用例、run 与报告
```

Skill 的产物写入对应的 feature 目录。运行目录 `runs/<run-id>/` 由 CLI 写入 `status.json` 与 `allure-results/`，流程产生的截图、日志和 `handoff.md` 也放在同一目录；未运行的范围不得写成通过。

## 开发与验证

```bash
bun install --frozen-lockfile
bun run check
bun run type-check
bun test --timeout 30000 ./tests ./cli/lib
bun run test:automation-lint
bun run ci
```

公开命令、目录或产物变化时，请同步更新 [README-EN.md](./README-EN.md) 与 [INSTALL.md](./INSTALL.md)。

## License

MIT
