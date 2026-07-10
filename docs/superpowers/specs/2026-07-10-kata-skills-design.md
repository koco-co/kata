# kata Skill 与插件设计

**日期**：2026-07-10  
**状态**：设计已确认

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

  ...
```

`.agents/skills`、`.claude/skills` 和 `.reasonix/skills` 不再保存业务正文，也不作为正式发行方式。插件 manifest 直接注册根级 `skills/`。开发测试如需平台专属目录，应在临时目录生成，测试结束后删除。

## 平台适配

各平台适配层只能处理以下内容：

- 插件如何安装；
- 平台怎样发现根级 `skills/`；
- 会话开始时怎样提醒模型检查 Skill；
- “询问用户”“维护计划”“派子代理”“读写文件”等动作怎样执行；
- 平台支持哪些权限、hook、子代理和 worktree 能力；
- 平台需要的展示信息和打包信息。

业务规则、流程顺序和完成条件不得写入平台适配层。

Codex 的 `agents/openai.yaml` 只保存展示名称和简介，由 Codex 打包过程加入。它不保存另一份提示词，也不改变 Skill 的 `name`。

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

`description` 以一至三句为目标。`SKILL.md` 尽量控制在 200 行以内，硬上限保持 500 行。引用只允许一层：`SKILL.md` 可以指向参考文件，参考文件不再要求继续追读另一批说明。

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

识别 Lanhu、Axure、PRD、截图、功能描述或 fixture，确定项目、版本和目标目录。找不到唯一项目或版本时，用一个合并后的问题向用户确认。

### 理清需求

读取本次任务真正需要的页面记录、项目知识和源码，整理已明确的功能、尚不清楚的地方、可测试场景和需要用户决定的范围。追溯字段保存在机器文件中，不进入普通叙述。

### 确认范围

只有存在实际分歧时才询问用户。一次说清测试点、枚举范围、缺少的信息和优先级。没有分歧时自动继续。

### 编写用例

主代理负责范围和沟通，子代理根据整理后的任务说明编写用例。初稿先进入结构化中间文件，再生成最终 Markdown，避免边写最终文档边修补字段。

### 检查并交付

依次检查文件结构、字段、数量、需求对应关系、步骤和预期结果，再生成同名 Markdown 与 XMind，并回读两份文件。

删除 URL-only 的特殊静默分支。所有输入采用同一沟通方式：开始时一条简短说明，处理中不连续播报，需要决定时才询问，完成后直接给出文件和检查结果。

## `playwright-automation`

`playwright-automation` 收敛为六个阶段：

```text
读取用例 → 检查环境 → 探查页面 → 生成脚本 → 运行修复 → 汇总交付
```

### 读取用例

从 `metadata.yaml` 读取用例文件，建立本次自动化清单，区分只读用例和会改变业务状态的用例。

### 检查环境

检查环境配置、登录状态、项目、权限、数据源和浏览器依赖。只有一个环境时说明选择后继续；多个环境时只询问一次；不再固定推荐某个 profile。

### 探查页面

先打开真实页面，记录本次任务需要的路由、菜单、字段和可见结果。书面用例与页面不一致时，能够确认的内容交给 `case-edit`，仍有分歧时询问用户。

### 生成脚本

每条用例由一个子代理负责自己的 case 文件。主代理统一维护 runner、公共 fixture、页面对象和共享代码，避免多个子代理同时修改公共文件。

创建、编辑、保存、导入、执行、发布和删除等业务动作通过页面完成。数据库脚本只用于准备测试数据，不能代替产品页面完成业务操作。

### 运行修复

先运行单条用例，再运行所属分组，最后运行目标 `full.spec.ts`。失败后区分产品、脚本、数据、权限和环境问题。每条用例最多修复三轮，不得通过放宽断言、捕获异常、跳过用例或调用后端接口换取通过。

### 汇总交付

只有同时满足以下条件，才能标为完成：

1. 目标 `full.spec.ts` 实际执行并退出 0；
2. 本次运行生成有效的 Allure 结果；
3. 会改变业务状态的用例在平台中留下对应记录，并能给出名称、ID、状态或页面截图；
4. 声明范围内没有未说明的跳过项；
5. 交付内容列出实际命令、退出码、通过数、失败数、跳过数和文件路径。

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
- 每个 Skill 至少完成一个 fixture 流程，或在依赖不可用时准确说明缺少什么；
- `case-draft` 和 `playwright-automation` 完成前述完整流程；
- 修改路由描述后，重新运行所有路由样例。

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
- `playwright-automation` 完成 full runner、Allure 和业务记录检查；
- 业务 Skill 中没有残留的 Claude 工具名；
- 平台适配文件不含业务流程副本。
