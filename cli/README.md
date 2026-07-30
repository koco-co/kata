# Kata CLI 命令参考

本文件由 `bun cli/scripts/generate-readme.ts --write` 根据 Commander 的递归 `--help` 输出生成。修改 CLI 命令、参数、默认值或作用后，必须重新生成并运行同步测试。

根命令只展示一级入口；下面按命令路径列出全部嵌套命令、参数和作用。

## kata

```text
Usage: kata [options] [command]

kata 工作区命令行

Options:
  -h, --help      display help for command

Commands:
  features        需求功能目录操作
  cases           用例导入、构建与检查
  config          运行时配置检查
  runs            运行结果目录操作
  env             管理本机私密的 DataAssets 平台环境
  repos           查询 config/repos/sources.yaml 配置的源码仓库(.repos/ 本地克隆)
  knowledge       项目知识的查询、维护与索引
  scans           代码 diff 扫描报告
  defects         缺陷报告生成与结构校验
  infra           基础设施配置和 SSH connectivity 检查
  automation      自动化目录结构管理
  project         项目工作区的创建、检查与修复
  prd             PRD 证据提取、确认式定稿与检查
  zentao          禅道集成:bug 抓取与创建
  lanhu           蓝湖集成:PRD 内容与截图抓取
  notify          业务通知预览、查询与失败重试
  help [command]  display help for command
```

## kata features

```text
Usage: kata features [options] [command]

需求功能目录操作

Options:
  -h, --help                     display help for command

Commands:
  resolve [options]              按路径标签协议定位（不存在则创建）需求功能目录
  list [options]                 列出项目下的需求功能
  show [options] <feature-path>  查看单个需求功能的路径身份与最近运行
  help [command]                 display help for command
```

## kata cases

```text
Usage: kata cases [options] [command]

用例导入、构建与检查

Options:
  -h, --help        display help for command

Commands:
  build [options]   按 YAML meta.exports 生成派生文件；缺省仅生成 XMind；requirements
                    布局按需求生成多个 L1
  import [options]  将 CSV/XLSX/MD/XMind 转为 YAML；XMind 可按 L1 拆分(默认 dry-run)
  sync [options]    按 YAML 中已声明的 spec_file 同步自动化文件名和 generated runner(默认
                    dry-run)
  lint [options]    检查 feature 目录结构、命名与 YAML 来源约束
  help [command]    display help for command
```

## kata config

```text
Usage: kata config [options] [command]

运行时配置检查

Options:
  -h, --help                 display help for command

Commands:
  doctor [options]           检查配置目录、示例、权限、Schema 引用和旧路径
  plugins-migrate [options]  从显式指定的旧 dotenv 文件迁移插件配置；默认 dry-run
  help [command]             display help for command
```

## kata runs

```text
Usage: kata runs [options] [command]

运行结果目录操作

Options:
  -h, --help                                  display help for command

Commands:
  exec [options] <feature-path> <command...>  创建 run 并在该 run 环境中执行命令
  new [options] <feature-path>                为需求功能分配新运行目录(等同旧 results path --new-run)
  path [options] <feature-path>               输出需求功能最近一次运行目录
  verify [options]                            校验运行目录交付契约(status.json/allure-results/handoff.md)，失败退出码 1
  prune [options] [feature-path]              清理旧运行目录：保留最近 N 个 + baseline + 已发布
  help [command]                              display help for command
```

## kata env

```text
Usage: kata env [options] [command]

管理本机私密的 DataAssets 平台环境

Options:
  -h, --help                         display help for command

Commands:
  add [options] <name>               创建一个本机私密平台环境模板
  list                               列出 config/env 中的平台环境，不显示 Cookie
  migrate [options]                  将旧版 DataAssets 私密环境迁移到 config/env
  show <name>                        显示单个平台环境，Cookie 始终脱敏
  doctor [options] [name]            检查一个或全部环境的配置、权限、凭据和在线精确解析
  run [options] <name> <command...>  在线精确解析环境后运行命令
  cookie                             管理环境 Cookie
  help [command]                     display help for command
```

## kata repos

```text
Usage: kata repos [options] [command]

查询 config/repos/sources.yaml 配置的源码仓库(.repos/ 本地克隆)

Options:
  -h, --help                              display help for command

Commands:
  prepare [options]                       按项目/模块/客户匹配仓库，并切换、快进到配置的 release 分支
  list                                    列出已配置并可定位的源码仓库
  sync-env                                报告全部已配置仓库的当前 branch/commit(不 fetch)
  show <repo> <refPath>                   git show <repo> <ref:path>;只读查看源文件
  grep [options] <repo> <pattern> [path]  git grep <repo> <pattern> [path];只读搜索
  pull <repo>                             git pull --ff-only <repo>;更新本地克隆到远端最新
  checkout <repo> <branch>                git checkout <repo> <branch>;切换本地克隆分支
  help [command]                          display help for command
```

## kata knowledge

```text
Usage: kata knowledge [options] [command]

项目知识的查询、维护与索引

Options:
  -h, --help       display help for command

Commands:
  read [options]   统一检索知识条目(term/module/pitfall/site)与项目概览
  write [options]  写入知识:独立条目用 --status/--title/--body;overview 用 --content JSON
  index [options]  重建知识库索引 _index.md
  help [command]   display help for command
```

## kata scans

```text
Usage: kata scans [options] [command]

代码 diff 扫描报告

Options:
  -h, --help        display help for command

Commands:
  create [options]  初始化扫描并写入正式 Markdown 报告
  help [command]    display help for command
```

## kata defects

```text
Usage: kata defects [options] [command]

缺陷报告生成与结构校验

Options:
  -h, --help        display help for command

Commands:
  hotfix [options]  从 ZenTao Bug 证据生成 Markdown hotfix 回归报告
  lint [options]    校验正式 Markdown 缺陷报告结构
  help [command]    display help for command
```

## kata infra

```text
Usage: kata infra [options] [command]

基础设施配置和 SSH connectivity 检查

Options:
  -h, --help                   display help for command

Commands:
  lint [options]               校验基础设施 Markdown 报告结构
  credentials                  管理本机 Credential Profile
  trust-host [options] <host>  显式记录已核验的 SSH host fingerprint
  inspect [options] <host>     执行受控的 SSH connectivity 检查并生成 infra Markdown 报告
  help [command]               display help for command
```

## kata automation

```text
Usage: kata automation [options] [command]

自动化目录结构管理

Options:
  -h, --help                                    display help for command

Commands:
  sql                                           校验和渲染自动化 SQL 模板；不连接数据库
  run [options] <feature-path>                  按完整 feature 路径执行 Playwright，并生成 Allure 结果与报告；需求专属参数使用 --set 临时覆盖
  coverage <feature-dir>                        检查 cases YAML 与 automation/tests/cases 的逐条映射
  generate-cases [options] <feature-dir>        检查缺失的 automation.spec_file；不会生成通用占位脚本
  generate [options] <feature-dir>              按 automation.spec_file 生成 runner import(默认 dry-run)
  migrate-placeholders [options] <feature-dir>  移除由自然语言通用 runner 生成的占位脚本和映射(默认 dry-run)
  scaffold [options] <feature-dir>              创建自动化骨架(tests/cases、runners、pages、fixtures、sql)
  normalize [options] <feature-dir>             检查自动化目录违规；仅迁移有明确受控目标的旧文件
  lint [options] [feature-dir]                  检查 Playwright 自动化代码规范
  help [command]                                display help for command
```

## kata project

```text
Usage: kata project [options] [command]

项目工作区的创建、检查与修复

Options:
  -h, --help        display help for command

Commands:
  scan [options]    检查项目骨架
  create [options]  创建或补齐项目工作区骨架
  repair [options]  安全修复项目工作区缺失项；不覆盖用户文件
  help [command]    display help for command
```

## kata prd

```text
Usage: kata prd [options] [command]

PRD 证据提取、确认式定稿与检查

Options:
  -h, --help          display help for command

Commands:
  migrate [options]   迁移旧根目录 PRD、需求笔记与测试点；默认 dry-run
  extract [options]   从蓝湖提取原始证据与截图；不直接生成 PRD
  finalize [options]  校验已确认会话并确定性生成 prd/prd.md
  lint [options]      检查 PRD 结构、未决项、提示词污染、frontmatter 与图片引用
  help [command]      display help for command
```

## kata zentao

```text
Usage: kata zentao [options] [command]

禅道集成:bug 抓取与创建

Options:
  -h, --help        display help for command

Commands:
  fetch [options]   从禅道 Bug 链接提取缺陷详情、解决叙述和修复分支
  create [options]  从正式 Markdown 报告在禅道创建 bug(fixed assignee,zentao variant body)
  help [command]    display help for command
```

## kata lanhu

```text
Usage: kata lanhu [options] [command]

蓝湖集成:PRD 内容与截图抓取

Options:
  -h, --help       display help for command

Commands:
  fetch [options]  已弃用：兼容入口，转发到 kata prd extract
  help [command]   display help for command
```

## kata notify

```text
Usage: kata notify [options] [command]

业务通知预览、查询与失败重试

Options:
  -h, --help                  display help for command

Commands:
  preview [options]           仅校验并预览固定业务事件内容；绝不发送通知
  list [options]              只读列出项目的本地通知账本
  show [options] <event-id>   只读查看一个本地通知账本（不含渠道凭据）
  retry [options] <event-id>  按账本重试此前失败的渠道；不会接受自定义内容
  help [command]              display help for command
```

## kata features resolve

```text
Usage: kata features resolve [options]

按路径标签协议定位（不存在则创建）需求功能目录

Options:
  --project <name>             项目名
  --module <module>            模块名（进入【模块】段）
  --description <text>         需求名（目录尾段）
  --customer <customer>        客户名（可选，【客户】段）
  --feature-version <version>  迭代版本 vX.Y.Z（与 --standing 二选一，必传其一）
  --standing                   常驻需求（落 features/_standing/），与 --feature-version
                               互斥 (default: false)
  --requirement-id <id>        确认属于顶层需求的真实编号（可选）
  --json                       以 JSON 输出结果 (default: false)
  -h, --help                   display help for command
```

## kata features list

```text
Usage: kata features list [options]

列出项目下的需求功能

Options:
  --project <name>       项目名
  --module <module>      按模块过滤
  --customer <customer>  按客户过滤
  --version <version>    按版本过滤
  --json                 以 JSON 输出结果 (default: false)
  -h, --help             display help for command
```

## kata features show

```text
Usage: kata features show [options] <feature-path>

查看单个需求功能的路径身份与最近运行

Options:
  --project <name>  项目名
  --json            以 JSON 输出结果 (default: false)
  -h, --help        display help for command
```

## kata cases build

```text
Usage: kata cases build [options]

按 YAML meta.exports 生成派生文件；缺省仅生成 XMind；requirements 布局按需求生成多个 L1

Options:
  --feature <dir>   feature 目录路径
  --project <name>  项目名；feature 传相对 features/ 的完整路径时必填
  -h, --help        display help for command
```

## kata cases import

```text
Usage: kata cases import [options]

将 CSV/XLSX/MD/XMind 转为 YAML；XMind 可按 L1 拆分(默认 dry-run)

Options:
  --feature <dir>        单 feature 导入的 feature 目录路径
  --project <name>       项目名；--split 时必填，或 feature 传相对 features/ 的完整路径时必填
  --version <version>    --split 的目标版本 vX.Y.Z
  --from <file>          历史输入文件路径
  --name <name>          用例集名称；默认取输入文件名
  --requirement-id <id>  多需求历史表格的需求编号
  --case-module-id <id>  禅道用例模块编号；未知时 YAML 写空字符串
  --split                按 XMind L1 拆为多个 feature/YAML；仅支持 .xmind (default:
                         false)
  --apply                归档原始文件并写入 YAML (default: false)
  -h, --help             display help for command
```

## kata cases sync

```text
Usage: kata cases sync [options]

按 YAML 中已声明的 spec_file 同步自动化文件名和 generated runner(默认 dry-run)

Options:
  --feature <dir>   feature 目录路径
  --project <name>  项目名；feature 传相对 features/ 的完整路径时必填
  --apply           按预览计划实际重命名并更新 runner (default: false)
  -h, --help        display help for command
```

## kata cases lint

```text
Usage: kata cases lint [options]

检查 feature 目录结构、命名与 YAML 来源约束

Options:
  --project <name>  项目名
  --feature <path>  只检查单个 feature（相对 features/ 的完整路径）
  --exit-code       存在 violation 时退出码为 1
  -h, --help        display help for command
```

## kata config doctor

```text
Usage: kata config doctor [options]

检查配置目录、示例、权限、Schema 引用和旧路径

Options:
  --scope <scope>  检查范围: all 或 infra (default: "all")
  --fix            只修复目录和权限，不创建凭据
  --exit-code      存在错误时退出码为 1
  -h, --help       display help for command
```

## kata config plugins-migrate

```text
Usage: kata config plugins-migrate [options]

从显式指定的旧 dotenv 文件迁移插件配置；默认 dry-run

Options:
  --source <path>  旧 dotenv 文件路径
  --root <path>    目标 Kata 工作区根目录 (default: "/Users/poco/Projects/kata")
  --apply          写入 config/plugin/*.yaml
  -h, --help       display help for command
```

## kata runs exec

```text
Usage: kata runs exec [options] <feature-path> <command...>

创建 run 并在该 run 环境中执行命令

Arguments:
  feature-path
  command           要运行的命令；必须放在 -- 之后

Options:
  --project <name>  项目名
  --type <type>     运行类型: preflight|run|selfrun|repair|baseline (default: "run")
  -h, --help        display help for command
```

## kata runs new

```text
Usage: kata runs new [options] <feature-path>

为需求功能分配新运行目录(等同旧 results path --new-run)

Options:
  --project <name>  项目名
  --type <type>     运行类型: preflight|run|selfrun|repair|baseline (default: "run")
  -h, --help        display help for command
```

## kata runs path

```text
Usage: kata runs path [options] <feature-path>

输出需求功能最近一次运行目录

Options:
  --project <name>  项目名
  -h, --help        display help for command
```

## kata runs verify

```text
Usage: kata runs verify [options]

校验运行目录交付契约(status.json/allure-results/handoff.md)，失败退出码 1

Options:
  --project <name>          项目名
  --feature <feature-path>  需求功能（相对 features/ 的完整路径）
  --run <run-id>            指定 run-id(默认最近一次)
  --json                    以 JSON 输出结果 (default: false)
  -h, --help                display help for command
```

## kata runs prune

```text
Usage: kata runs prune [options] [feature-path]

清理旧运行目录：保留最近 N 个 + baseline + 已发布

Options:
  --project <name>  项目名
  --keep <n>        保留最近 N 个运行 (default: "5")
  --apply           真正执行删除(默认 dry-run) (default: false)
  -h, --help        display help for command
```

## kata env add

```text
Usage: kata env add [options] <name>

创建一个本机私密平台环境模板

Arguments:
  name         环境名称

Options:
  --url <url>  平台根地址
  -h, --help   display help for command
```

## kata env list

```text
Usage: kata env list [options]

列出 config/env 中的平台环境，不显示 Cookie

Options:
  -h, --help  display help for command
```

## kata env migrate

```text
Usage: kata env migrate [options]

将旧版 DataAssets 私密环境迁移到 config/env

Options:
  --apply     执行迁移；默认只预览 (default: false)
  -h, --help  display help for command
```

## kata env show

```text
Usage: kata env show [options] <name>

显示单个平台环境，Cookie 始终脱敏

Arguments:
  name        环境名称

Options:
  -h, --help  display help for command
```

## kata env doctor

```text
Usage: kata env doctor [options] [name]

检查一个或全部环境的配置、权限、凭据和在线精确解析

Arguments:
  name        环境名称

Options:
  --all       检查全部环境 (default: false)
  --offline   仅做本地检查 (default: false)
  -h, --help  display help for command
```

## kata env run

```text
Usage: kata env run [options] <name> <command...>

在线精确解析环境后运行命令

Arguments:
  name                   环境名称
  command                要运行的命令；建议在前面使用 --

Options:
  --inherit-env <names>  额外继承的环境变量名，逗号分隔 (default: "")
  -h, --help             display help for command
```

## kata env cookie

```text
Usage: kata env cookie [options] [command]

管理环境 Cookie

Options:
  -h, --help            display help for command

Commands:
  set [options] <name>  从 stdin 读取并在线验证 Cookie，成功后原子替换
  help [command]        display help for command
```

## kata repos prepare

```text
Usage: kata repos prepare [options]

按项目/模块/客户匹配仓库，并切换、快进到配置的 release 分支

Options:
  --project <name>   工作区项目
  --module <name>    需求模块
  --customer <name>  客户；标品需求传“标品”
  -h, --help         display help for command
```

## kata repos list

```text
Usage: kata repos list [options]

列出已配置并可定位的源码仓库

Options:
  -h, --help  display help for command
```

## kata repos sync-env

```text
Usage: kata repos sync-env [options]

报告全部已配置仓库的当前 branch/commit(不 fetch)

Options:
  -h, --help  display help for command
```

## kata repos show

```text
Usage: kata repos show [options] <repo> <refPath>

git show <repo> <ref:path>;只读查看源文件

Arguments:
  repo        group/repo 或 repo
  refPath     如 HEAD:src/a.ts

Options:
  -h, --help  display help for command
```

## kata repos grep

```text
Usage: kata repos grep [options] <repo> <pattern> [path]

git grep <repo> <pattern> [path];只读搜索

Arguments:
  repo         group/repo 或 repo
  pattern      搜索模式
  path         限定路径

Options:
  --ref <ref>  指定 ref (default: "HEAD")
  -h, --help   display help for command
```

## kata repos pull

```text
Usage: kata repos pull [options] <repo>

git pull --ff-only <repo>;更新本地克隆到远端最新

Arguments:
  repo        group/repo 或 repo

Options:
  -h, --help  display help for command
```

## kata repos checkout

```text
Usage: kata repos checkout [options] <repo> <branch>

git checkout <repo> <branch>;切换本地克隆分支

Arguments:
  repo        group/repo 或 repo
  branch      目标分支

Options:
  -h, --help  display help for command
```

## kata knowledge read

```text
Usage: kata knowledge read [options]

统一检索知识条目(term/module/pitfall/site)与项目概览

Options:
  --project <name>     项目名
  --module <name>      按模块过滤(匹配标题或 tags)
  --keyword <word>     按关键词检索(匹配标题/正文/tags)
  --type <types>       限定类型,逗号分隔(term,module,pitfall,site)
  --status <statuses>  限定状态,逗号分隔；默认仅 verified，使用 all 读取全部状态
  --json               JSON 输出 (default: false)
  -h, --help           display help for command
```

## kata knowledge write

```text
Usage: kata knowledge write [options]

写入知识:独立条目用 --status/--title/--body;overview 用 --content JSON

Options:
  --project <name>      项目名
  --type <type>         term | overview | module | pitfall | site
  --status <status>     四态:verified | observed | conflicting | deprecated
  --title <title>       条目标题
  --body <md>           条目正文 Markdown
  --tags <tags>         标签,逗号分隔
  --source <source>     证据来源(独立条目必填)
  --content <json>      overview 内容 JSON(仅 overview 类型可用)
  --confidence <level>  overview 置信度:high | medium | low(仅 overview 类型可用)
                        (default: "medium")
  --confirmed           observed/低置信确认写入 (default: false)
  --dry-run             只预览不写入(仅 overview 类型可用) (default: false)
  --force               越过 block 级冲突(仅 overview 类型可用) (default: false)
  -h, --help            display help for command
```

## kata knowledge index

```text
Usage: kata knowledge index [options]

重建知识库索引 _index.md

Options:
  --project <name>  项目名
  -h, --help        display help for command
```

## kata scans create

```text
Usage: kata scans create [options]

初始化扫描并写入正式 Markdown 报告

Options:
  --project <name>     项目名
  --repo <name>        config/repos/sources.yaml 中的 group/repo 或 repo 短名
  --base-branch <ref>  基线分支
  --head-branch <ref>  目标分支
  --patch <path>       已有 patch 文件；与分支对二选一
  --slug <slug>        覆盖默认 slug
  --yyyymm <ym>        覆盖默认当前 YYYYMM
  --skip-fetch         跳过 git fetch (default: false)
  --force              覆盖已存在的同名报告 (default: false)
  -h, --help           display help for command
```

## kata defects hotfix

```text
Usage: kata defects hotfix [options]

从 ZenTao Bug 证据生成 Markdown hotfix 回归报告

Options:
  --bug-id <number>       禅道 Bug ID
  --url <url>             禅道 Bug 页面 URL
  --project <name>        项目名
  --yyyymm <yyyymm>       报告年月，例如 202607
  --slug <slug>           报告 slug
  --evidence-file <path>  已核对的 hotfix 业务证据 JSON 文件
  -h, --help              display help for command
```

## kata defects lint

```text
Usage: kata defects lint [options]

校验正式 Markdown 缺陷报告结构

Options:
  --report <path>  报告 Markdown 路径
  --exit-code      存在 violation 时退出码为 1
  -h, --help       display help for command
```

## kata infra lint

```text
Usage: kata infra lint [options]

校验基础设施 Markdown 报告结构

Options:
  --report <path>  infra Markdown 报告路径
  --exit-code      存在 violation 时退出码为 1
  -h, --help       display help for command
```

## kata infra credentials

```text
Usage: kata infra credentials [options] [command]

管理本机 Credential Profile

Options:
  -h, --help            display help for command

Commands:
  set [options] <name>  交互式录入密码，不接受命令行密码参数
  help [command]        display help for command
```

## kata infra trust-host

```text
Usage: kata infra trust-host [options] <host>

显式记录已核验的 SSH host fingerprint

Options:
  --fingerprint <fingerprint>  SHA256 fingerprint
  -h, --help                   display help for command
```

## kata infra inspect

```text
Usage: kata infra inspect [options] <host>

执行受控的 SSH connectivity 检查并生成 infra Markdown 报告

Options:
  --check <check>      目前只支持 connectivity
  --project <project>  项目工作区
  --slug <slug>        报告 slug
  --dry-run            只解析配置，不连接服务器
  -h, --help           display help for command
```

## kata automation sql

```text
Usage: kata automation sql [options] [command]

校验和渲染自动化 SQL 模板；不连接数据库

Options:
  -h, --help                   display help for command

Commands:
  lint [options] <sql-file>    按全局 SQL profile 校验模板
  render [options] <sql-file>  将显式 --set 值渲染到 stdout，不写入项目目录
  help [command]               display help for command
```

## kata automation run

```text
Usage: kata automation run [options] <feature-path>

按完整 feature 路径执行 Playwright，并生成 Allure 结果与报告；需求专属参数使用 --set 临时覆盖

Options:
  --env <name>                  平台环境名
  --project <name>              工作区项目名 (default: "dataAssets")
  --type <type>                 运行类型: preflight|run|selfrun|repair|baseline
                                (default: "run")
  --set <path=value>            临时覆盖 YAML 配置，例如 automation.cases=1-72 (default:
                                [])
  --workers <number>            临时覆盖 Playwright worker 数
  --sort-cases                  按 cases YAML 中 case_id 降序执行
  --no-sort-cases               按 cases YAML 原顺序执行
  --headless                    使用无头/有头浏览器
  --headed                      使用无头/有头浏览器
  --continue-on-failure         失败后是否继续后续用例
  --no-continue-on-failure      失败后是否继续后续用例
  --skip-precondition-setup     是否跳过前置准备
  --no-skip-precondition-setup  是否跳过前置准备
  -h, --help                    display help for command
```

## kata automation coverage

```text
Usage: kata automation coverage [options] <feature-dir>

检查 cases YAML 与 automation/tests/cases 的逐条映射

Options:
  -h, --help  display help for command
```

## kata automation generate-cases

```text
Usage: kata automation generate-cases [options] <feature-dir>

检查缺失的 automation.spec_file；不会生成通用占位脚本

Options:
  --apply     拒绝并明确提示，不生成占位脚本 (default: false)
  -h, --help  display help for command
```

## kata automation generate

```text
Usage: kata automation generate [options] <feature-dir>

按 automation.spec_file 生成 runner import(默认 dry-run)

Options:
  --apply     写入 generated.ts (default: false)
  -h, --help  display help for command
```

## kata automation migrate-placeholders

```text
Usage: kata automation migrate-placeholders [options] <feature-dir>

移除由自然语言通用 runner 生成的占位脚本和映射(默认 dry-run)

Options:
  --apply     执行移除并重建 generated runner (default: false)
  -h, --help  display help for command
```

## kata automation scaffold

```text
Usage: kata automation scaffold [options] <feature-dir>

创建自动化骨架(tests/cases、runners、pages、fixtures、sql)

Options:
  --force     覆盖已存在文件 (default: false)
  -h, --help  display help for command
```

## kata automation normalize

```text
Usage: kata automation normalize [options] <feature-dir>

检查自动化目录违规；仅迁移有明确受控目标的旧文件

Options:
  --apply      执行修复(默认 dry-run) (default: false)
  --exit-code  存在违规时退出码为 1
  -h, --help   display help for command
```

## kata automation lint

```text
Usage: kata automation lint [options] [feature-dir]

检查 Playwright 自动化代码规范

Options:
  --shared          检查 workspace 项目的 _shared 页面、helper 与 fixture
  --project <name>  --shared 模式下的项目名(默认取 KATA_ACTIVE_PROJECT)
  --exit-code       存在 violation 时退出码为 1
  -h, --help        display help for command
```

## kata project scan

```text
Usage: kata project scan [options]

检查项目骨架

Options:
  --project <name>  项目名
  -h, --help        display help for command
```

## kata project create

```text
Usage: kata project create [options]

创建或补齐项目工作区骨架

Options:
  --project <name>  项目名
  --dry-run         只预览 (default: false)
  --confirmed       确认写入 (default: false)
  -h, --help        display help for command
```

## kata project repair

```text
Usage: kata project repair [options]

安全修复项目工作区缺失项；不覆盖用户文件

Options:
  --project <name>  项目名
  --apply           执行修复(默认 dry-run) (default: false)
  -h, --help        display help for command
```

## kata prd migrate

```text
Usage: kata prd migrate [options]

迁移旧根目录 PRD、需求笔记与测试点；默认 dry-run

Options:
  --project <name>  工作区项目
  --feature <path>  仅迁移相对 features/ 的一个需求
  --apply           执行迁移；不传时只输出计划
  -h, --help        display help for command
```

## kata prd extract

```text
Usage: kata prd extract [options]

从蓝湖提取原始证据与截图；不直接生成 PRD

Options:
  --url <url>      含 docId、versionId、pageId 的蓝湖需求 URL
  --feature <dir>  目标 feature 目录
  --force          忽略相同版本缓存并重新提取
  -h, --help       display help for command
```

## kata prd finalize

```text
Usage: kata prd finalize [options]

校验已确认会话并确定性生成 prd/prd.md

Options:
  --feature <dir>  目标 feature 目录
  -h, --help       display help for command
```

## kata prd lint

```text
Usage: kata prd lint [options]

检查 PRD 结构、未决项、提示词污染、frontmatter 与图片引用

Options:
  --feature <dir>  目标 feature 目录
  --exit-code      存在错误时退出码为 1
  -h, --help       display help for command
```

## kata zentao fetch

```text
Usage: kata zentao fetch [options]

从禅道 Bug 链接提取缺陷详情、解决叙述和修复分支

Options:
  --bug-id <number>  禅道 Bug ID(数字),例如 151858
  --url <url>        禅道 Bug 页面 URL,例如
                     "https://zentao.example.cn/zentao/bug-view-151858.html"
  --output <dir>     输出目录路径,例如 <hotfixDir>/.temp
  -h, --help         display help for command
```

## kata zentao create

```text
Usage: kata zentao create [options]

从正式 Markdown 报告在禅道创建 bug(fixed assignee,zentao variant body)

Options:
  --report <path>  BugReport Markdown 路径
  --config <path>  ZenTao 配置 yaml (default:
                   "/Users/poco/Projects/kata/cli/integrations/zentao/zentao.config.yaml")
  --dry-run        只组装字段不提交,打印 payload (default: false)
  -h, --help       display help for command
```

## kata lanhu fetch

```text
Usage: kata lanhu fetch [options]

已弃用：兼容入口，转发到 kata prd extract

Options:
  --url <url>          蓝湖页面 URL,例如
                       "https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx"
  --project <name>     已弃用
  --base-dir <dir>     已弃用
  --feature-dir <dir>  目标 feature 目录；证据写入 prd/evidence/，截图写入 prd/assets/
  --pages <ids>        已弃用；页面只取 URL 的 pageId
  -h, --help           display help for command
```

## kata notify preview

```text
Usage: kata notify preview [options]

仅校验并预览固定业务事件内容；绝不发送通知

Options:
  -e, --event <type>  业务事件类型
  -d, --data <json>   严格符合事件 schema 的 JSON 对象
  --list-events       列出支持的业务事件
  --describe <event>  显示一个事件的字段契约
  -h, --help          display help for command

支持事件:
cases-built  用例构建完成
cases-imported  历史用例导入完成
ui-test-completed  UI 自动化验证通过
ui-test-failed  UI 自动化验证失败
ui-test-needs-input  UI 自动化等待确认
bug-analysis-completed  缺陷分析报告校验完成
conflict-analysis-completed  冲突分析报告校验完成
scan-completed  扫描报告校验完成
hotfix-report-created  Hotfix 回归报告创建完成

使用 --describe <event> 查看严格字段契约。
```

## kata notify list

```text
Usage: kata notify list [options]

只读列出项目的本地通知账本

Options:
  --project <name>  项目名
  -h, --help        display help for command
```

## kata notify show

```text
Usage: kata notify show [options] <event-id>

只读查看一个本地通知账本（不含渠道凭据）

Options:
  --project <name>  项目名
  -h, --help        display help for command
```

## kata notify retry

```text
Usage: kata notify retry [options] <event-id>

按账本重试此前失败的渠道；不会接受自定义内容

Options:
  --project <name>  项目名
  --confirmed       确认按当前配置重试失败渠道
  -h, --help        display help for command
```

## kata env cookie set

```text
Usage: kata env cookie set [options] <name>

从 stdin 读取并在线验证 Cookie，成功后原子替换

Arguments:
  name        环境名称

Options:
  --stdin     必须从 stdin 读取，避免进入 shell 历史
  -h, --help  display help for command
```

## kata infra credentials set

```text
Usage: kata infra credentials set [options] <name>

交互式录入密码，不接受命令行密码参数

Options:
  --username <username>  认证用户名
  --stdin                从 stdin 读取密码，不回显
  -h, --help             display help for command
```

## kata automation sql lint

```text
Usage: kata automation sql lint [options] <sql-file>

按全局 SQL profile 校验模板

Options:
  --profile <name>  config/automation/sql-profiles.yaml 中的 profile
  -h, --help        display help for command
```

## kata automation sql render

```text
Usage: kata automation sql render [options] <sql-file>

将显式 --set 值渲染到 stdout，不写入项目目录

Options:
  --profile <name>   先按 profile 校验模板
  --set <KEY=value>  占位符替换值，可重复 (default: [])
  -h, --help         display help for command
```
