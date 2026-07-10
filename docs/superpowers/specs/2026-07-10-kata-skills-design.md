# kata Skill 与插件设计

**日期**：2026-07-10

**状态**：方向已确认，等待用户复核书面设计

## 目标

让所有 kata Skill 只维护一份正文，并能由 Codex、Claude、Reasonix 和 Hermes 通过各自的插件方式加载。Codex 是本次真实运行的目标平台，其他平台只保证结构完整。

设计参考：

- [Superpowers v6.1.1](https://github.com/obra/superpowers/tree/v6.1.1)
- [Agent Skills 规范](https://agentskills.io/specification)
- [Codex Build skills](https://learn.chatgpt.com/docs/build-skills)

## 单一 Skill 树

所有业务 Skill 从 `.claude/skills` 迁到根目录：

```text
skills/
  using-kata/
    SKILL.md
    references/
      codex-tools.md
      claude-tools.md
      reasonix-tools.md
      hermes-tools.md

  case-draft/
    SKILL.md
    phases/
    prompts/
    references/
    scripts/
    assets/

  playwright-automation/
    SKILL.md
    phases/
    prompts/
    references/
    scripts/
    assets/

  case-edit/
  case-hotfix/
  defect-analyze/
  infra-diagnose/
  knowledge-curate/
  sql-merge-validate/
  workspace-manage/
```

`.agents/skills`、`.claude/skills` 和 `.reasonix/skills` 不再保存业务正文，也不作为正式发行方式。插件 manifest 直接注册根级 `skills/`。开发测试如需平台专属目录，应在临时目录生成，测试结束后删除。

九个业务 Skill 的固定清单是：

1. `case-draft`；
2. `case-edit`；
3. `case-hotfix`；
4. `defect-analyze`；
5. `infra-diagnose`；
6. `knowledge-curate`；
7. `playwright-automation`；
8. `sql-merge-validate`；
9. `workspace-manage`。

`using-kata` 是公共入口，不计入九个业务 Skill。打包和测试从根级 `skills/` 自动枚举目录，再与上述清单核对。目录多一个、少一个或重名都应失败，不能手工维护另一份待执行列表。

公共代码的依赖方向固定为：`contracts → CLI → Skill 脚本`。Skill 可以调用公开 CLI 或导入专用公共包；CLI 与 contracts 不得反向读取 `skills/` 内的私有脚本。

## 平台适配

各平台适配层只能处理以下内容：

- 插件如何安装；
- 平台怎样发现根级 `skills/`；
- 会话开始时怎样提醒模型检查 Skill；
- “询问用户”“维护计划”“派子代理”“读写文件”等动作怎样执行；
- 平台支持哪些权限、hook、子代理和 worktree 能力；
- 平台需要的展示信息和打包信息。

业务规则、流程顺序和完成条件不得写入平台适配层。

Codex 的 `agents/openai.yaml` 只保存展示名称、简介、图标和建议输入等平台展示信息，由 Codex 打包过程加入。它不保存业务流程，也不改变 Skill 的 `name`。

### 交付矩阵

四个平台共用根级 `skills/`，但分别生成安装包：

| 平台 | 适配源文件 | 打包产物 | Skill 发现方式 | 本次检查 |
| --- | --- | --- | --- | --- |
| Codex | `.codex-plugin/plugin.json`、`adapters/codex/` | `dist/codex/kata-<version>.zip` | manifest 的 `skills: ./skills/` | 临时 `CODEX_HOME` 中真实安装并启动新任务 |
| Claude | `.claude-plugin/plugin.json`、`adapters/claude/` | `dist/claude/kata-<version>.zip` | Claude 插件 manifest | 解包、manifest、引用与目录检查 |
| Reasonix | `adapters/reasonix/` | `dist/reasonix/kata-<version>.zip` | 安装器写入指定的 `.reasonix/skills/` | 在临时目标目录执行安装与结构检查 |
| Hermes | `adapters/hermes/` | `dist/hermes/kata-<version>.zip` | 安装器写入指定的 `.hermes/skills/` | 在临时目标目录执行安装与结构检查 |

Reasonix 与 Hermes 的运行目录是安装结果，不是源码。安装器必须接收明确的 `--target`，不得改写仓库里的根级 `skills/`，也不得提交生成副本。

Codex 包采用和 Superpowers 相同的无外层根目录结构：`.codex-plugin/`、`skills/`、`assets/`、`README.md` 与许可证直接位于压缩包根部。每个 Skill 的 `agents/openai.yaml` 在打包阶段加入；源 Skill 正文仍只有一份。

`kata` CLI 作为独立的公共运行包生成 `dist/cli/kata-<version>.tgz`。四个平台安装包只声明所需 CLI 版本，不复制 CLI 源码。干净环境检查先把 CLI 安装到临时前缀，再安装平台包，并确认 `kata --version` 与插件版本一致。

打包、安装与检查统一使用：

```text
kata plugins pack --runtime <codex|claude|reasonix|hermes> --output <archive>
kata plugins install --runtime <name> --archive <archive> --target <temporary-home>
kata plugins check --runtime <name> --archive <archive>
```

`plugins install` 只写入显式 `--target`，不得默认修改用户真实的 Agent 主目录。正式安装说明可以让用户选择真实目标；自动化测试始终使用临时目录。

所有版本只从根 `package.json` 读取。每次打包生成 `dist/release-manifest.json`，记录版本、Git commit、文件数和 SHA-256。压缩包不得包含测试、历史运行目录、旧 Skill 树或开发缓存。

### 项目入口文档

- `AGENTS.md` 只保留 Codex 启动方式、仓库级开发约束和公共检查入口；
- `CLAUDE.md` 只保留 Claude 启动方式、hook 与权限说明；
- Reasonix、Hermes 的入口文件遵循同样边界；
- 共享业务规则放入根级 Skill，能自动判断的规则放入 CLI、schema 或测试；
- 入口文档不得复制 `case-draft`、`playwright-automation` 或其他业务流程。

静态检查需要比较入口文档与 Skill 的重复段落，并确认旧命令、旧路径和平台专属工具名没有进入公共正文。

## Frontmatter

公共 `SKILL.md` 默认只使用开放规范中的字段：

```yaml
---
name: case-draft
description: 根据需求材料生成或复核测试用例。这里同时写清触发、排除和转交条件。
---
```

只有确有需要时才增加 `license`、`compatibility` 或 `metadata`。`argument-hint`、`model`、`effort`、`user-invocable` 等平台字段移到对应平台的打包信息中。

公共正文不依赖 `allowed-tools` 限制安全边界。命令权限由平台配置、CLI 自身和项目规则共同控制。

## 路由方式

不建立 `router/`、`routes.yaml` 或运行时路由程序。路由直接通过 Skill 完成。

### 第一次选择

Codex 在初始上下文中读取每个 Skill 的 `name` 和 `description`。`description` 要在一至三句内写清：

- 哪些输入应该触发；
- 哪些相似输入不属于本 Skill；
- 不属于时应交给哪个 Skill。

Lanhu、Axure、ZenTao URL、bug ID、功能目录、`.md`、`.xmind` 和 `.csv` 等明确特征要直接写出，不用含糊的业务简称代替。

### 加载后复核

Skill 正文开头保留简短的“适用范围”。加载后发现选择不合适时，只允许自动转交一次。转交后仍不能确定，应向用户说明分歧，不得在 Skill 之间循环。

### `using-kata`

`using-kata` 只承担三项公共工作：

1. 提醒模型在处理 kata 请求前检查已有 Skill；
2. 多个 Skill 同时适用时说明选择顺序；
3. 加载当前平台的工具说明。

它不复制九个业务 Skill 的完整 `description`，也不维护第二份路由表。

### 路由测试

每个 Skill 至少准备四组输入：

1. 应当触发；
2. 不应触发；
3. 应转交给另一个 Skill；
4. 信息不足，需要询问用户。

修改 `description` 后重新执行全部样例。Codex 的真实运行需要覆盖典型 URL、ID、目录和产物文件，以及同时包含多个特征的输入。

## Skill 内部结构

简单 Skill 可以只有 `SKILL.md`。复杂 Skill 使用以下目录：

```text
skill-name/
  SKILL.md
  phases/       # 有严格先后关系的阶段
  prompts/      # 子代理任务模板
  references/   # 按需查阅的说明
  scripts/      # 可重复执行的确定性工作
  assets/       # 模板、schema 和示例文件
```

`SKILL.md` 只保留：

1. 用途；
2. 适用范围；
3. 主流程；
4. 文件加载时机；
5. 暂停、转交和询问条件；
6. 完成标准。

字段、枚举、目录结构、文件命名和产物完整性由 schema、脚本和测试检查。提示词只处理需要理解、取舍和沟通的部分。

`description` 以一至三句为目标。`SKILL.md` 尽量不超过 200 行，最多 500 行。引用只允许一层：`SKILL.md` 可以指向参考文件，参考文件不再要求继续追读另一批说明。

## 子代理 Prompt

所有子代理 prompt 使用同一骨架：

```text
任务目的
输入材料
允许修改的范围
必须完成的动作
返回格式
停止条件
```

Prompt 不复制整份 Skill，也不再要求子代理“不要读取 SKILL.md”。需要遵循的内容通过明确的相对路径列入必读文件。公共规则只有一个存放位置。

## 中文写作

Skill 与 prompt 使用自然、直接的中文：

- 先写动作，再说明原因；
- 一段只表达一件事；
- 用“以当前页面为准”“请补充缺少的信息”“核对运行结果”等日常说法；
- 避免生硬的复合名词、口号式标签和不符合中文习惯的抽象说法；
- `source_ref`、`run_id` 等机器字段只出现在代码、schema 或字段说明中；
- 同一规则只写一次，其他位置用短句指出文件；
- 能由程序拦住的问题，不再依靠连续堆叠“必须、严禁、不得”。

## 用例文件名

最终用例文件使用需求名称的简洁形式：

```text
cases/<文件名主体>.md
cases/<文件名主体>.xmind
```

文件名主体只保留中文、英文字母和数字。空格、换行、制表符及标点全部删除。Markdown 与 XMind 必须同名，完整需求名称保存在文档标题、XMind 根节点和 `metadata.yaml` 中。

所有 Skill 从 metadata 读取实际路径，不查找固定的 `archive.md` 或 `cases.xmind`，也不根据目录名猜测。

## `case-draft`

`case-draft` 收敛为五个阶段：

```text
接收材料 → 理清需求 → 确认范围 → 编写用例 → 检查并交付
```

### 接收材料

识别 Lanhu、Axure、PRD、截图、功能描述或 fixture，确定项目、版本和目标目录。找不到唯一项目或版本时，一次列出所有待确认项。

### 理清需求

读取本次任务真正需要的页面截图、页面探查记录、项目知识和源码，整理已明确的功能、尚不清楚的地方、可测试场景和需要用户决定的范围。追溯字段保存在机器文件中，不进入普通叙述。

### 确认范围

只有存在实际分歧时才询问用户。一次说清测试点、枚举范围、缺少的信息和优先级。没有分歧时自动继续。

### 编写用例

主代理负责范围和沟通，子代理根据整理后的任务说明编写用例。初稿先写入 `<feature>/runs/<run-id>/work/case-draft.json`，通过 `CaseDraft` schema 后再生成最终 Markdown。成功交付后，`result.json` 保留该文件的 SHA-256；中间文件按运行清理规则处理。失败时保留中间文件，便于继续修正。

### 检查并交付

依次检查文件结构、字段、数量、需求对应关系、步骤和预期结果，再生成同名 Markdown 与 XMind，并回读两份文件。

删除“输入仅含 URL”时采用的特殊流程。所有输入采用同一沟通方式：开始时简短说明一次，处理中不连续播报，需要决定时才询问，完成后直接给出文件和检查结果。

## `playwright-automation`

`playwright-automation` 收敛为六个阶段：

```text
读取用例 → 检查环境 → 探查页面 → 生成脚本 → 运行修复 → 汇总交付
```

### 读取用例

从 `metadata.yaml` 读取用例文件，建立本次自动化清单，区分只读用例和会改变业务状态的用例。每条已选用例都要生成通过 schema 的 `AutomationIntent`；缺少明确操作、预期结果或业务记录要求时停止生成脚本。

### 检查环境

检查环境配置、登录状态、项目、权限、数据源和浏览器依赖。只有一个环境时说明选择后继续；多个环境时只询问一次；不再固定推荐某个 profile。业务记录使用包含 `run_id` 的唯一名称。共享环境中的旧自动化记录只能在用户授权后通过页面清理，不得沿用旧 ID 作为本次完成结果。

### 探查页面

先打开真实页面，记录本次任务需要的路由、菜单、字段和可见结果。书面用例与页面不一致时，能够确认的内容交给 `case-edit`，仍有分歧时询问用户。

### 生成脚本

每条用例由一个子代理负责自己的单条用例文件。主代理统一维护 runner、公共 fixture、页面对象和共享代码，避免多个子代理同时修改公共文件。

生成脚本前，先把用例中的字段限制、规则数量、重复组合、规则包数量、数据源、抽样、分区、过滤和强弱设置写入 `AutomationIntent`。适用字段必须与原始用例逐项核对，缺少明确值时停止，不得用通用生成器猜测。

创建、编辑、保存、导入、执行、发布、删除和状态核对等业务动作通过页面完成。数据库脚本只用于准备测试数据，不能代替产品页面完成业务操作。

### 运行修复

先运行单条用例，再运行所属分组，最后运行目标 `full.spec.ts`。每次失败都要区分产品、脚本、数据、权限和环境问题，再按原因修复。只要仍能安全推进就继续；确认是外部阻碍时，列出受影响用例和下一条可执行命令。不得通过放宽断言、捕获异常、跳过用例或调用后端接口换取通过。

### 汇总交付

只有同时满足以下条件，才能标为完成：

1. 目标 `full.spec.ts` 实际执行并退出 0；
2. `full.spec.ts` 收集到至少一条测试，所选用例、实际执行用例和跳过用例能够逐项对上；
3. 本次新建的空运行目录生成 Allure 结果，结果文件中的 run ID、用例 ID 和时间都属于本次运行；
4. 会改变业务状态的用例在平台中留下对应记录，并能给出名称或 ID、适用时的状态，以及与本次 run ID 关联的页面截图或 Allure 附件；
5. 声明范围内没有未说明的跳过项；
6. 交付内容列出实际命令、退出码、用例与测试的通过数、失败数、跳过数和文件路径。

只读用例需要在用例信息中明确标记，才能不要求业务记录。它不能代替本应创建或修改数据的流程。

## 检查范围

### 公共结构

- 所有 Skill 符合 Agent Skills 目录；
- 业务正文不含平台工具名；
- 平台 manifest 指向同一个 `skills/`；
- 没有重复 Skill 正文和发行用软链树；
- `using-kata` 的平台说明与当前实际工具一致。

### Codex 真实运行

- 在干净环境安装打包后的插件；
- 新建任务触发全部业务 Skill；
- 每个业务 Skill 至少完成一个隔离 fixture 流程；fixture 必须实际调用其脚本、CLI 和产物检查，不能只比较提示词文本；
- `case-draft` 和 `playwright-automation` 完成前述完整流程；
- 修改路由描述后，重新运行所有路由样例。

九个 fixture 的最低范围如下：

| Skill | 必须完成的 Codex fixture |
| --- | --- |
| `case-draft` | 从需求材料生成并回读同名 Markdown、XMind 与 metadata |
| `case-edit` | 在 Markdown、XMind、CSV 间往返转换，并确认语义未变 |
| `case-hotfix` | 从缺陷材料生成一条可执行的回归用例 |
| `defect-analyze` | 从堆栈或 diff 产出可定位的问题分析 |
| `infra-diagnose` | 对隔离的 SSH/连通性环境完成诊断并记录结果 |
| `knowledge-curate` | 在临时知识库中写入、查询并更新一条规则 |
| `playwright-automation` | 对测试站点运行 `full.spec.ts`，生成 Allure 与业务记录 |
| `sql-merge-validate` | 对隔离数据 fixture 执行全部规则包校验并汇总结果 |
| `workspace-manage` | 初始化临时工作区并完成自检与收尾 |

此外，`case-draft` 与 `playwright-automation` 还要在已配置的真实测试环境完成集成流程。依赖、权限或环境缺失时记入 `unresolved_blockers`，该项保持未完成，不能算作通过。

### 其他平台

Claude、Reasonix 和 Hermes 只检查：manifest、发现路径、平台说明、资源引用和打包结构。最终报告不得把这些检查表述成真实运行通过。

## 迁移

1. 建立根级 `skills/`；
2. 移动公共正文，先保持含义不变；
3. 建立平台 manifest 和打包脚本；
4. 删除业务正文中的平台工具名；
5. 重写 `using-kata` 与所有 `description`；
6. 重构两个核心 Skill；
7. 更新其余 Skill；
8. 完成 Codex 实际安装和调用检查；
9. 删除旧软链树和旧平台入口。

## 完成标准

- 根级 `skills/` 是唯一可编辑正文；
- 新增或修改 Skill 不需要同步多份文件；
- 九个业务 Skill 的触发、排除和转交样例全部稳定；
- Codex 插件可从干净环境安装；
- `case-draft` 生成同名 Markdown 与 XMind；
- `playwright-automation` 完成 `full.spec.ts`、Allure 和业务记录检查；
- 业务 Skill 中没有残留的 Claude 工具名；
- 平台适配文件不含业务流程副本。
