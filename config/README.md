# Kata runtime configuration

Kata keeps configuration under four owners:

```text
config/policies/   Enforced contracts: artifact routing, case lint, SQL dialects, XMind mapping
config/private/    Private environments, integrations, infrastructure and repository config
config/examples/   Redacted templates mirroring config/private/ (all tracked)
config/automation/ Playwright runtime behavior settings (tracked)
```

Keep `config/private/` at `0700` and every private YAML at `0600`; `kata config doctor`
checks both. Everything under `config/private/` is gitignored as a whole and must never be
committed. Tracked configuration (`config/policies/`, `config/examples/`, `config/automation/`,
and this README) belongs in Git.

每个私密配置族都有对应的脱敏模板，模板只保留字段结构、默认行为和填写说明：

| 私密配置 | 脱敏模板 | 用途 |
| --- | --- | --- |
| `private/environments/<env>.yaml` | `examples/environments/env.example.yaml` | 平台 URL、Cookie、租户、项目、数据源和环境自动化参数 |
| `private/infrastructure/hosts.yaml` | `examples/infrastructure/hosts.example.yaml` | SSH 主机、端口、凭据引用和已核验指纹 |
| `private/infrastructure/data_sources.yaml` | `examples/infrastructure/data_sources.example.yaml` | 数据源类型、地址、端口、数据库和凭据引用 |
| `private/infrastructure/credentials.yaml` | `examples/infrastructure/credentials.example.yaml` | 服务器和数据源凭据 profile |
| `private/integrations/lanhu.yaml` | `examples/integrations/lanhu.example.yaml` | Lanhu Cookie 或账号密码 |
| `private/integrations/zentao.yaml` | `examples/integrations/zentao.example.yaml` | 禅道 Cookie、账号密码和创建映射 |
| `private/integrations/notify.yaml` | `examples/integrations/notify.example.yaml` | Webhook、签名密钥和 SMTP 通道 |
| `private/repositories.yaml` | `examples/repositories.example.yaml` | 本机源码仓库路径、分支和筛选范围 |

`config/examples/` 的文件可以安全阅读和复制，但不得填入真实地址、Cookie、密码、Webhook、
签名密钥、SSH 指纹或内部仓库拓扑。已有本机私密文件不会由文档整理覆盖。

Use the CLI to inspect and write configuration. This directory does not contain
an additional Agent instruction layer.

```bash
kata config doctor
kata config doctor --scope infra
kata infra credentials set <credential-name> --username <username>
kata infra trust-host <host> --fingerprint <SHA256 fingerprint>
kata infra inspect <host> --check connectivity --project <project>
```

Every `private/repositories.yaml` entry declares `project`, configured release
`branch`, and non-empty `modules` / `customers` selector arrays. Use the
literal `"*"` only for a repository intentionally shared across every module
or customer. `kata repos prepare --project ... --module ... --customer ...`
updates only matching repositories and blocks when none match.

`policies/xmind-mapping.yaml` is the single source of truth for XMind root titles.
Every supported project declares a display `root_name` and its fixed ZenTao
module ID. Missing project mappings are hard errors; renderers do not infer a
fallback from a feature path.

Runtime environment variables remain supported only as explicit CI or one-off
overrides; the repository does not load a root `.env` automatically, and no
legacy dotenv migration is provided.

ZenTao fetch credentials and the `kata zentao create` product/module/assignee
mapping share `private/integrations/zentao.yaml`; its tracked example documents
both sections. There is no second create-config file under `cli/`.

Set `KATA_WORKSPACE_ROOT` to an absolute path to move the project workspace
out of the framework repository: the CLI then resolves projects under
`<KATA_WORKSPACE_ROOT>/<project>` instead of the in-repo `workspace/`, so
real project data stays in a private location and the framework repository
keeps only redacted minimal fixtures.

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
| `automation` | runtime | 跟踪 | Playwright 运行时行为设置（可被 --set 覆盖） | — |

<!-- END GENERATED -->
