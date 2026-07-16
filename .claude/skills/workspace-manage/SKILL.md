---
name: workspace-manage
description: 回答 kata 能力/功能菜单/命令帮助类提问，或创建、初始化、自检、收尾、修复项目工作区。触发短语如「kata 能干嘛」「功能菜单」「初始化工作区」「自检/收尾工作区」。仅生成或编辑用例请转至 case-*；维护业务知识请转至 knowledge-curate；UI 自动化请转至 playwright-automation。
argument-hint: "<功能菜单 | init | 自检 | 收尾 | 修复>"
user-invocable: true
model: sonnet
effort: medium
---

# workspace-manage

统一管理 kata 项目工作区，分两种模式：**能力问答**按命令索引直接回答、不碰工作区；**工作区操作**（创建 / 初始化 / 自检 / 收尾 / 修复）动手前先确认目录边界，确保产物落在约定位置。

## 路由边界

以下场景不属本 skill 范围，请转至对应 skill：

- 生成或编辑 QA 用例 → case-draft / case-edit
- 维护业务知识 → knowledge-curate
- UI 自动化 → playwright-automation

## 工作流

1. **能力问答**：问 kata 能干嘛、功能菜单、某命令怎么用——按命令索引直接回答，不改动工作区。
2. **工作区操作**：按下方命令流执行，动手前先确认目录边界（见「目录边界」），确保产物落在 `workspace/{project}/` 之下。

## 工作区操作命令

flag 拼写以各命令 `--help` 为准。

- **自检 / 收尾**：`kata workspace verify` 输出环境检查状态表（Node、依赖、workspace、.env、插件、源码仓库）；前 4 项全 pass 才算环境就绪，failed 项按 detail 里的提示修。
- **自检骨架**：`kata project scan --project <name>` 对比当前骨架与目标，输出缺失的目录 / 文件 / 配置注册情况；`skeleton_complete` 与 `config_registered` 都为 true 即完整。
- **创建 / 修复**：先 `kata project create --project <name> --dry-run` 预览将创建什么，确认后改用 `--confirmed` 落盘；不带任一 flag 会拒绝执行并提示加 `--confirmed`。
- **发现源码仓库**：`kata repos sync-env --project <name>` 读取 `.env` 的 `KATA_SOURCE_REPOS` 与 `KATA_SOURCE_REPO_ROOT`，只发现并验证已有外部 Git 仓库，不 clone、不 fetch、不创建缓存。用 `kata repos show|grep|list --help` 通过 `git show` / `git grep` / `git ls-tree` 查询指定 ref。
- **解析 / 自检配置**：`kata env resolve --project <name> --env <env>` 只输出配置来源、键名与是否已配置；`kata env doctor --project <name> --env <env>` 检查旧 overlay、权限、cookie 缺失或被 Git 跟踪等问题。

## 目录边界

- 产物一律写入 `workspace/{project}/` 之下，不外溢到仓库其它位置。
- 不创建根级 `.kata/{project}/` 或 `workspace/{project}/.kata/` runtime 数据。源码事实来自 `.env` 配置的外部 Git 仓库，并且只能通过 `kata repos show|grep|list` 查询；需要修改源码时，在源码仓库自己的工作区操作。
- 根 `.env` 是唯一 dotenv，环境变量与外部仓库位置必须同步声明到 `.env.example`；不得创建或加载 `.env.envs`、根 `.env.local`、`workspace/{project}/.env.local`。显式进程环境优先于根 `.env`。
- `KATA_DATAASSETS_ENV` 选择 `workspace/{project}/_shared/env/<env>.yaml`。项目/环境级 URL、项目与数据源 ID、运行参数放在该 profile；UI 认证只使用 `auth.cookie`。若基础 profile 被 Git 跟踪，真实 cookie 放在被忽略的 `_shared/env/.local/<env>.yaml`，且这个本地文件只能覆盖 `auth.cookie`。
- 通过 `kata env` 迁移/设置且输出不得回显密钥；不在生产代码写死用户目录、绝对机器路径或 session 文件路径，不创建或引用 `.kata/auth/**`、`auth.session_path`。
