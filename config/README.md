# Kata 运行时配置

Kata 按职责将配置分为四个区域：

```text
config/policies/   强制契约：产物路由、用例 lint、SQL 方言、XMind 映射
config/private/    私密配置：环境、集成、基础设施和源码仓库
config/examples/   与 private 结构对应的脱敏模板，全部纳入 Git
config/automation/ Playwright 运行时行为配置，纳入 Git
```

`config/private/` 权限必须为 `0700`，其中每个私密 YAML 必须为 `0600`；
`kata config doctor` 会检查两者。整个私密目录均被 Git 忽略，任何真实值都不得提交。
`config/policies/`、`config/examples/`、`config/automation/` 和本 README 必须纳入 Git。

`policies/repo-policy.yaml` 同时锁定根目录文档边界：贡献与工程规则统一维护在
`CLAUDE.md`（`AGENTS.md` 指向同一内容），不再保留独立的 `CONTRIBUTING.md`。

每个私密配置文件只对应一个脱敏模板，精确关系由下方生成区维护。模板只保留字段结构、
默认行为和填写说明，可以复制使用，但不得写入真实地址、Cookie、密码、Webhook、签名密钥、
SSH 指纹或内部仓库拓扑。已有本机私密文件不会被文档生成命令覆盖。

linked worktree 按文件读取私密配置：当前 worktree 中的文件优先，缺失时回退主工作树；
`kata config doctor` 检查实际生效的私密根，不会因为主工作树已有配置而创建第二套本地目录。
`kata config show` 对私密文件只输出整体脱敏占位符，不展示值、数字、布尔开关或动态对象名。

配置应通过 CLI 检查和写入；本目录不提供额外的 Agent 指令层。

```bash
kata config doctor
kata config doctor --scope infra
kata infra credentials set <credential-name> --username <username>
kata infra trust-host <host> --fingerprint <SHA256 fingerprint>
kata infra inspect <host> --check connectivity --project <project>
```

`private/repositories.yaml` 中每个仓库必须声明 `project`、release `branch`，以及非空的
`modules`、`customers` 选择器。只有明确适用于全部模块或客户时才使用字面量 `"*"`。
`kata repos prepare --project ... --module ... --customer ...` 只更新匹配仓库；无匹配时阻断。

`policies/xmind-mapping.yaml` 是 XMind 根标题的唯一来源。每个受支持项目必须声明展示用
`root_name` 和固定的 ZenTao 模块 ID；缺少映射时直接报错，渲染器不得从 feature 路径推断。

插件凭据只从 `config/private/integrations/` 读取，不提供环境变量覆盖；运行时环境变量仅保留给
工作区根定位（`KATA_WORKSPACE_ROOT`）与平台环境执行（`kata env run` 注入）。仓库不会自动加载
根目录 `.env`，也不提供旧 dotenv 配置迁移。

ZenTao 拉取凭据与 `kata zentao create` 的产品、模块和负责人映射共用
`private/integrations/zentao.yaml`；tracked example 同时说明两部分，不再维护第二份创建配置。

将 `KATA_WORKSPACE_ROOT` 设置为绝对路径，可以把项目工作区移出框架仓库。CLI 将项目解析到
`<KATA_WORKSPACE_ROOT>/<project>`，而不是仓库内的 `workspace/`，从而让真实项目数据保留在
私密位置，框架仓库只保存脱敏的最小 fixture。

<!-- BEGIN GENERATED -->

配置族一览（由 config 注册表派生，禁止手改）:

| 族 | 职责 | 私密性 | 说明 | example 模板 |
| --- | --- | --- | --- | --- |
| `environments` | secret | 私密 | 平台 URL、Cookie、租户、项目、数据源与环境自动化参数 | `config/examples/environments/env.example.yaml` |
| `integrations` | secret | 私密 | Lanhu、ZenTao、通知（DingTalk/Feishu/WeCom/SMTP）集成配置 | `config/examples/integrations/lanhu.example.yaml`<br>`config/examples/integrations/zentao.example.yaml`<br>`config/examples/integrations/notify.example.yaml` |
| `infrastructure` | secret | 私密 | SSH 主机、数据源、凭据 profile 与已核验指纹 | `config/examples/infrastructure/hosts.example.yaml`<br>`config/examples/infrastructure/data_sources.example.yaml`<br>`config/examples/infrastructure/credentials.example.yaml` |
| `repositories` | secret | 私密 | 本机源码仓库路径、分支与筛选范围 | `config/examples/repositories.example.yaml` |
| `repo-policy` | contract | 跟踪 | 仓库产物路由与命名契约（repo lint / bun run check 读取） | — |
| `cases-lint` | contract | 跟踪 | 用例内容 lint 契约（first-step 入口模式、禁用词、数据源类型） | — |
| `sql-profiles` | contract | 跟踪 | SQL 方言契约（方言 profile、必需/禁用片段与占位符） | — |
| `xmind-mapping` | contract | 跟踪 | XMind 根标题与 ZenTao 模块 ID 映射契约 | — |
| `automation` | runtime | 跟踪 | Playwright 运行时行为设置（可被 --set 覆盖） | `config/automation/playwright.example.yaml` |

私密配置与脱敏模板对应（由注册表派生，禁止手改）:

| 私密配置 | 脱敏模板 | 用途 |
| --- | --- | --- |
| `config/private/environments/<name>.yaml` | `config/examples/environments/env.example.yaml` | 平台 URL、Cookie、租户、项目、数据源与环境自动化参数 |
| `config/private/integrations/lanhu.yaml` | `config/examples/integrations/lanhu.example.yaml` | Lanhu、ZenTao、通知（DingTalk/Feishu/WeCom/SMTP）集成配置 |
| `config/private/integrations/zentao.yaml` | `config/examples/integrations/zentao.example.yaml` | Lanhu、ZenTao、通知（DingTalk/Feishu/WeCom/SMTP）集成配置 |
| `config/private/integrations/notify.yaml` | `config/examples/integrations/notify.example.yaml` | Lanhu、ZenTao、通知（DingTalk/Feishu/WeCom/SMTP）集成配置 |
| `config/private/infrastructure/hosts.yaml` | `config/examples/infrastructure/hosts.example.yaml` | SSH 主机、数据源、凭据 profile 与已核验指纹 |
| `config/private/infrastructure/data_sources.yaml` | `config/examples/infrastructure/data_sources.example.yaml` | SSH 主机、数据源、凭据 profile 与已核验指纹 |
| `config/private/infrastructure/credentials.yaml` | `config/examples/infrastructure/credentials.example.yaml` | SSH 主机、数据源、凭据 profile 与已核验指纹 |
| `config/private/repositories.yaml` | `config/examples/repositories.example.yaml` | 本机源码仓库路径、分支与筛选范围 |

<!-- END GENERATED -->
