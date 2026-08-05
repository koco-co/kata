# 滚动 48 小时代码审查问题

- 审查快照：`20464848fe24198fd098d1e978a133480cf02035..b58550dd780e55d824de9738fe10eaee66ea35b8`
- 快照时间：2026-08-04 21:46:14 +08:00
- 提交数量：50
- 排除范围：当前工作树未提交改动；`workspace/**/cases/**/*.yaml` 用例内容

## 1. `defect-analyze` 的触发描述劫持普通 code review

- 严重程度：高
- 位置：`.claude/skills/defect-analyze/SKILL.md:3`、`.claude/skills/defect-analyze/SKILL.md:16`
- 证据：Skill 的 description 将“扫描 diff、分支、MR 或 PR 中的静态缺陷”声明为触发范围，Routing 又把任意“diff、分支对、变更文件集、评审、MR、PR”直接路由到 `scan`。因此用户只要求普通 code review 时，也会自动加载 `defect-analyze`，继而强制进入报告路径、模板和 `kata defects lint` 流程。
- 影响：通用代码审查被错误改变成交付物驱动的缺陷分析流程；额外读取无关 workflow、提出不必要的范围确认，并可能把报告写入 `analyses/scan-report/`，覆盖用户明确指定的审查方式和输出位置。
- lint / 测试缺口：`tests/skills/skill-contract.test.ts` 只校验统一阶段和机械完成条件，`tests/skills/fixtures/parity-expectations.json` 只校验 `defect-analyze` 的正向关键词与命令存在；没有“普通 code review 不触发该 Skill”的负向路由契约。
- 建议修复：将自动触发条件收窄为用户明确要求“缺陷分析报告 / 静态缺陷扫描报告”或提供 `kata scans` 输入的场景；从通用触发词中移除“评审、diff、分支、MR、PR”。新增正负向路由 fixture，至少覆盖“对近两天提交进行 code review”不得触发，以及“基于该 patch 生成静态缺陷扫描报告”应触发。

## 2. feature 数量测试依赖未跟踪目录，干净检出必然失败

- 严重程度：高
- 引入提交：`8a601487a601dd1c3988f1fbdd3185281e9d2263`
- 位置：`tests/cli/feature-path-contract.test.ts:18`
- 证据：该提交把固定断言从 66 改为 68，但 `b58550dd` 的 Git tree 与审查基线 `20464848` 都只有 66 个包含跟踪文件的 feature。当前工作树恰好另有两个未跟踪的 v7.0.1 feature 目录，因此本机测试会得到 68；使用 `git archive b58550dd` 构造的纯 Git 快照运行同一测试时实际得到 66，断言失败。
- 影响：测试结果取决于开发者本机未提交目录；当前工作树可通过，CI、全新 clone 或其他开发者环境会稳定失败。更危险的是，未跟踪批量整改内容会掩盖已提交测试本身的错误。
- lint / 测试缺口：现有仓库验证在脏工作树直接枚举文件系统，没有校验固定数量是否能由 Git 索引重建，也没有 clean-checkout 测试阶段。
- 建议修复：不要用未跟踪工作树修正固定计数。若数量本身是契约，应从一份受跟踪 inventory 推导并逐项比对；若只验证目录结构，则删除脆弱的总数断言。CI 至少增加一次纯 Git 检出验证，确保测试不依赖 ignored / untracked 目录。

## 3. lint 建议使用 `requirement_id: none`，但解析与 schema 明确拒绝

- 严重程度：高
- 引入提交：`fd5f7831a5cc7bb5666ec1ea67f341bf6a3c485d`
- 位置：`cli/lib/cases/content-lint.ts:304`；冲突契约位于 `cli/lib/cases/parse.ts:171-179`、`cli/lib/cases/schema.ts:14-15`
- 证据：`case_sql_table_name` 的修复建议是“声明数字 requirement_id 或 \"none\"”；同一快照中的 parser 与 schema 只接受 `^\\d+$`。在 `b58550dd` 快照中将 `meta.requirement_id` 设置为 `none`，`parseCasesYaml` 直接报错“字段 meta.requirement_id 必须是数字字符串”。
- 影响：用户严格照 lint 的“可执行修复建议”整改后，会从内容 lint 错误转成结构解析错误，无法得到可通过的 YAML；批量整改还可能把同一错误扩散到更多文件。
- lint / 测试缺口：测试只断言各条规则能命中或放行，没有验证 lint 建议生成的示例值能够通过 parser、schema 与 build 的完整合同链。
- 建议修复：先统一业务语义。如果历史用例允许无需求 ID，则 parser、schema、类型、定位命令与表名规则必须共同支持一个明确表示；否则从 lint 文案删除 `none`。新增“应用建议后 parse + validate + content lint 可通过”的闭环回归测试。

## 4. 内容 lint 丢失 case / 字段位置，并把所有错误误标为“标题”

- 严重程度：中
- 引入提交：`8a601487a601dd1c3988f1fbdd3185281e9d2263`
- 位置：`cli/lib/cases/content-lint.ts:143-153`、`cli/lib/cases/content-lint.ts:1011-1128`；调用方 `cli/lib/features-lint.ts:154-167`
- 证据：统一的 `makeViolation` 无论规则来自前置条件、步骤、SQL、环境占位符还是 automation，都固定输出“标题: YAML用例存在违规内容”；`CaseContentViolation` 只有 `rule` 与 `message`，没有 `case_id`、字段或步骤序号。禁词还先跨整份文件按 category 聚合，最终只输出命中的词，无法反查具体用例。缺失 requirement ID 的复现输出同样被标成“标题”。
- 影响：一个文件包含几十到数百条用例时，lint 虽然阻断，却无法指出应修改哪条用例、哪个字段；用户只能全文搜索，重复词还可能对应多个位置。该输出不满足仓库规定的“规则、位置、原因和可执行修复建议”合同。
- lint / 测试缺口：现有测试主要断言 `rule` 和部分 message 片段，没有要求每条违反项携带可定位的 case ID / field / step index，也没有覆盖同一禁词出现在多条用例时的位置保真。
- 建议修复：扩展 violation 结构为至少 `{ rule, caseId, field, stepIndex?, message }`，逐 case 产生禁词违规而非跨文件聚合；CLI 输出 `文件:case_id:字段[:步骤]`。新增多用例同词、同用例多字段以及步骤级错误的定位回归测试。

## 5. `VALUES` 行数按任意括号计数，单行函数表达式会被误判为批量数据

- 严重程度：中
- 引入提交：`8a601487a601dd1c3988f1fbdd3185281e9d2263`
- 位置：`cli/lib/cases/content-lint.ts:374-381`
- 证据：`countValuesRows` 在 `VALUES ... ;` 中用 `/\\([^()]*\\)/g` 统计括号数量，这会把 `coalesce(...)`、`upper(...)`、`current_date()` 等函数参数当成独立数据行。固定快照中，一条仅含一个 row tuple、但含八个函数括号的 INSERT 被报告为“VALUES 显式写入 8 行”，触发 `case_bulk_rows`。
- 影响：合法的一行初始化 SQL 会被要求改成集合生成语句或文件脚本；用户为绕过误报可能反而把简单、可读的 fixture 改复杂。字符串、嵌套函数和子表达式也会造成类似误计数。
- lint / 测试缺口：当前回归只覆盖纯字面量的六行 VALUES 与 `range()` 放行，没有单行嵌套函数、字符串括号、多行函数 tuple 等 SQL 结构。
- 建议修复：按引号、注释与括号深度扫描 `VALUES`，只统计深度为零时开始的 row tuple；或复用现有 SQL tokenizer，而不是正则统计所有括号。补充“一行多函数=1”“六行且每行含函数=6”“字符串中的括号不计数”回归。

## 6. action 原子性只统计编号行，普通复合动作和冒号动作都能绕过

- 严重程度：高
- 引入提交：`8a601487a601dd1c3988f1fbdd3185281e9d2263`；扩大漏洞的提交：`fd5f7831a5cc7bb5666ec1ea67f341bf6a3c485d`
- 位置：`cli/lib/cases/content-lint.ts:54`、`cli/lib/cases/content-lint.ts:256-265`、`cli/lib/cases/content-lint.ts:1066-1074`
- 证据：`numberedActionItemCount` 只统计匹配 `^\\d+\\)` 的行，少于两行就放行，因此 `点击导出，下载文件，打开并核对内容` 这种最常见的未编号多阶段 action 返回零违规。后续新增的 `FORM_FIELD_LINE_RE = /^\\d+\\)\\s+[^:：\\n]+[:：]/` 又把所有“编号 + 任意文本 + 冒号”视为表单字段；`1) 点击导出：提交导出任务` 与 `2) 下载文件：打开并核对内容` 同处一个 action 时也返回零违规。
- 影响：该硬闸实际依赖作者主动使用特定编号格式；不编号或给动作加冒号即可把页面切换、提交、下载、核对和状态变更挤在一个 action 中，步骤与预期结果不再一一对应。
- lint / 测试缺口：测试只覆盖编号动作，以及“存储过程名称: ... / SQL: ...”的正向表单示例；没有未编号复合动作、动作动词加冒号、表单字段与提交动作混排、冒号后多个动词等负向用例。
- 建议修复：不要以编号数量作为原子性前提。先识别操作动词和阶段边界，再对真实表单字段块做受上下文约束的豁免；字段块至少应从属于明确的“配置如下”主动作且字段名不得包含操作动词。新增上述两类逃逸文本的回归。

## 7. 新增的提交消息校验没有接入任何提交范围或 CI，违规提交仍可正常通过

- 严重程度：中
- 引入提交：`69b464be30e0877ca06dfa32ae997f08876fdc9f`
- 位置：`cli/commands/repo.ts:14-22`、`package.json:25-34`、`.github/workflows/ci.yml:20-32`
- 证据：`validateCommitMessage` 只有在人工显式传入 `kata repo lint --commit-message <subject>` 时才执行。`bun run check` 调用的是不带该参数的 `kata repo lint --exit-code`；GitHub CI 虽已取得完整历史并计算 diff 范围，也没有把该范围内的提交 subject 交给校验器。全仓库搜索不到其他调用入口。
- 影响：该规则只是一个手动试算器，不是仓库硬闸。任何格式错误的提交都能通过本地 `check` 和 CI，项目的 Emoji Conventional Commit 约束继续依赖人工自觉；提交 `69b464be` 的“增加提交消息格式校验”不能形成实际治理效果。
- lint / 测试缺口：单元测试只直接调用纯函数，没有创建包含合法 / 非法历史的临时仓库，也没有证明 CI 会检查 PR 或 push 范围内的每个提交。
- 建议修复：提供显式的 `--commit-range <base>..<head>`（或独立 commits lint）并逐条读取 subject；CI 复用现有 PR `origin/<base>...HEAD` 与 push `before..HEAD` 范围执行。新增临时 Git 历史集成测试，覆盖多提交、merge commit 策略、空 before 和非法 subject。

## 8. “显式项目”校验允许 glob 元字符，Playwright 项目隔离可被通配

- 严重程度：中
- 引入提交：`97bb70feceed433a1c3be54f3e9f3b8c736e76b1`
- 位置：`playwright.config.ts:37-43`、`playwright.config.ts:99-111`；校验器位于 `cli/lib/workspace-locator.ts:14-19`
- 证据：Playwright 将 `KATA_ACTIVE_PROJECT` 直接插入 `testMatch` / `testIgnore` glob，只先调用 `validateProjectName`。该校验器仅拒绝空值、`.`、`..` 和路径分隔符；固定快照实测 `*`、`?`、`[ab]`、`{dataAssets,batchWorks}` 全部被接受。因而所谓“显式单项目”可以变成跨项目或模式匹配。
- 影响：discovery 可扫描用户未选择的其他项目；若其他入口绕过 `locateProject` 直接加载 Playwright config，执行范围也可能扩大。项目名还可能构造无效 glob，导致发现结果随文件布局变化。
- lint / 测试缺口：新增测试只检查 help 中出现 `--project` 以及默认 `dataAssets` 被移除，没有验证项目值是 glob-safe，也没有断言 discovery 结果只来自精确目录。
- 建议修复：项目名使用明确 allow-list，例如 `^[A-Za-z0-9][A-Za-z0-9_-]*$`，并在 Playwright 配置层调用 `locateProject(project)` 验证目录真实存在；或对 glob 元字符做严格转义。新增 `* ? [] {}`、隐藏目录、空白名和跨项目 discovery 的负向测试。

## 9. 大型自动化 suite 只是移出 runner，仍以单文件直接进入执行图

- 严重程度：中
- 引入提交：`b94dc1913c7c398a9bcebc3141610465b9d7f6be`
- 位置：`workspace/dataAssets/features/v6.4.7/【数据资产】集成测试用例/automation/tests/flows/integration-suite.ts:1-2757`、`workspace/dataAssets/features/v6.4.8/【岚图汽车】【数据质量】支持每个数据表的规则集管理/automation/tests/flows/rule-set-management-suite.ts:1-4370`；对应 runner 分别位于 `automation/tests/runners/smoke.spec.ts:1-2`、`automation/tests/runners/full.spec.ts:1-3`
- 证据：提交标题称“将大型自动化套件移出 runner 入口”，实际是把原 2,757 / 4,371 行 runner 以 99% copy similarity 搬到 `flows/`，新 runner 随即直接 import 整个 suite。单文件规模、模块初始化副作用、测试收集耦合和修改冲突面均未降低；两份实现仍远超 `AGENTS.md` 规定的 800 行上限。
- 影响：后续任何小改动仍需触碰数千行共享文件，难以隔离 review、回归与失败定位；runner 的表面行数下降还会制造“已完成拆分”的假象，却没有缩小实际依赖图或测试收集成本。
- lint / 测试缺口：全仓库只有文档声明 800 行上限；`repo lint`、automation lint、Biome 与 CI 都没有检查第一方源码文件长度，因此把超大文件换目录即可继续通过机械校验。
- 建议修复：按业务域 / flow / fixture / assertion 拆成可独立验证的模块，并让 runner 只组合明确 suite；在 `repo lint` 增加第一方 TS/JS 文件行数规则，排除项仅限显式登记的 vendor、generated 与不可拆 fixture，不能按 `flows/` 目录整体豁免。

## 10. requirement ID 多目标 build 逐个提交，后续失败会留下部分产物并触发通知

- 严重程度：高
- 引入提交：`6e2a358637fa0a4cdd831144d5396a52fecc2582`
- 位置：`cli/commands/cases-build.ts:64-80`、`cli/commands/cases-build.ts:218-241`、`cli/commands/cases-build.ts:257-294`；目标发现位于 `cli/lib/cases/requirement-locate.ts:64-87`
- 证据：需求 ID 默认匹配全部项目中的所有 feature，但 action 对目标执行 `runCasesBuild → commitArtifacts → emitBusinessNotificationSafely` 后才处理下一个目标，没有全量预检或跨目标事务。固定快照复现：`batchWorks` 中同 ID 的合法 feature 排在前面，`dataAssets` 中同 ID feature 的 `cases` 为空；命令最终 exit 1 并报告“用例数为 0”，但前一个 feature 的 XMind 已创建，stdout 已输出 `created`，且通知流程已经执行一次。
- 影响：调用方看到失败退出码时无法假定“没有变更”；同一需求跨项目可能处于一半新、一半旧的派生状态。若通知已启用，外部接收者还会先收到部分完成消息，之后的本地失败无法撤回，形成错误业务信号。
- lint / 测试缺口：新增测试只覆盖两个目标都合法时“全部生成”，没有覆盖第二个目标解析 / schema / content lint / render 失败，也没有断言失败时所有目标零写入、零通知。
- 建议修复：先对全部目标完成路径校验、YAML parse、摘要链、schema、content lint、render 和写入权限预检；全部成功后再统一提交。通知必须等所有目标提交成功后发送聚合事件。若不实现跨目标事务，则同一 ID 匹配多个 feature 时强制要求 `--project` / `--feature`，避免一个命令产生部分成功语义。

## 11. 退役的通知开关在运行时被静默忽略，并按默认启用处理

- 严重程度：高
- 引入提交：`2d66e0d825be4d469540cac986aab857e9fa784b`
- 位置：`cli/lib/plugin-config.ts:198-231`、`cli/lib/config-registry.ts:128-155`、`cli/integrations/notify/index.ts:79-114`
- 证据：配置迁移把全局和渠道开关从 `is_enable` 改为 `enabled`，但运行时 `loadNotifyConfig` 不校验未知字段；读不到新字段时反而把全局及各渠道 `enabled` 默认为 `true`。只有单独运行 `kata config validate` 才会拒绝旧键，通知发送路径直接调用宽松 loader。固定快照用合成配置复现：全局和钉钉均写 `is_enable: false`，同时保留事件白名单与 webhook，实际解析结果为全局启用、渠道启用、未阻断，且钉钉进入待发送渠道列表。
- 影响：尚未迁移的私密配置看起来明确关闭通知，业务命令却可能向外部 webhook 实际发送消息；这是配置迁移中的 fail-open，且 `emitBusinessNotificationSafely` 只捕获异常，静默忽略旧键不会触发异常。
- lint / 测试缺口：配置注册表只测试显式 validate 的未知键拒绝，没有从真实业务通知入口加载旧配置并断言零网络调用；也没有“关闭字段迁移后必须 fail closed”的兼容性回归。
- 建议修复：通知运行时 loader 必须复用严格 schema，任何未知或退役开关都抛出带路径的配置错误；安全包装层将其记录为 blocked / failed 且不得调用 fetch。补充旧顶层开关、旧渠道开关、旧 SMTP `pass` 的集成测试，并以 mock fetch 断言调用次数为零。

## 12. 未声明数据源 / 数据库占位符即可跳过全部 SQL、表名和批量数据 lint

- 严重程度：高
- 涉及提交：`8a601487a601dd1c3988f1fbdd3185281e9d2263`
- 位置：`cli/lib/cases/content-lint.ts:857-969`
- 证据：`lintDatasourceSql` 在没有同字母的 `${DataSourceX}` 与 `${SchemaX}` 配对时于第 887 行提前返回；方言校验、完整表名校验和 `VALUES` 行数限制都位于该 return 之后。固定快照中，前置条件直接写未限定的 `CREATE TABLE` 和六行 `INSERT ... VALUES`，不写任何配对占位符，整个内容 lint 返回零违规。
- 影响：作者删除占位符后，不仅能绕过 `case_datasource_pair`，还会同时绕过 SQL 方言、稳定测试表名、数据库限定与批量行数硬闸；含 `DROP`、`DELETE` 或错误方言的危险 SQL 也可能显示 lint 通过。
- lint / 测试缺口：现有 SQL 负向测试都主动提供了成对占位符，没有覆盖“SQL 存在但占位符全部缺失”这一最短逃逸路径。
- 建议修复：先独立检测 SQL / 表引用；一旦存在 DDL 或 DML，就必须要求数据源与数据库配对，并无条件执行表引用、批量行数与基础 SQL 安全校验。方言确实未知时应报告“缺少数据源类型”，而不是跳过。新增无占位符的 CREATE、DROP、DELETE、六行 VALUES 回归。

## 13. 内联导入记录上限只看 `LineN` 的数字，不看实际记录数量

- 严重程度：中
- 引入提交：`8a601487a601dd1c3988f1fbdd3185281e9d2263`
- 位置：`cli/lib/cases/content-lint.ts:822-854`
- 证据：规则只提取每行标签中的数字，并仅在任一数字大于阈值时阻断；不检查标签唯一、连续或物理记录数。固定快照中写六条不同记录但全部标为 `Line1:`，既满足“包含 Line1”，也没有数字大于 5，`case_import_fixture` 返回零违规。
- 影响：任意数量的 CSV / XLSX 内联记录都可通过重复或回退行号绕过生成脚本要求；后续人工据此创建文件时还会面对重复行号和不确定顺序。
- lint / 测试缺口：测试只覆盖正常的 `Line1...Line6`，没有重复编号、跳号、倒序、零号和物理行数超过阈值的场景。
- 建议修复：统计匹配到的物理记录条数，并要求编号严格等于 `1..N`；超过阈值按实际条数阻断。错误信息同时给出重复、缺失或越界编号。新增 `Line1` 重复六次、`Line1/Line3`、倒序和 `Line0` 回归。

## 14. 标题规则声称禁止“在…时”，正则却完整放行

- 严重程度：中
- 引入提交：`8a601487a601dd1c3988f1fbdd3185281e9d2263`
- 位置：`cli/lib/cases/content-lint.ts:49-53`、`cli/lib/cases/content-lint.ts:1019-1025`
- 证据：注释与 lint 文案都明确禁止“在…时”从句，但 `CASE_TITLE_RE` 的操作 / 结果部分只排除方括号、逗号、圆括号和下划线，并未排除该句式。固定快照中标题 `验证【数据质量】-【规则库】在打开页面时，展示规则列表` 返回零违规。
- 影响：lint 的实际合同与修复文案不一致；批量整改者会得到互相矛盾的结果，标题仍可保留规则宣称要消除的条件从句。
- lint / 测试缺口：只有下划线、缺操作、通用断言等负向样例，没有直接把文案中的“在…时”作为负向 fixture。
- 建议修复：在正则前增加语义级禁止片段检查，或将标题拆成结构化 parser 后明确拒绝操作 / 结果中的 `在...时`。新增句首、句中以及末尾条件括号内出现该句式的边界测试，明确哪些位置允许。

## 15. 前一日表达式里的 `current_date()` 被同时当成当日数据证据

- 严重程度：中
- 引入提交：`8a601487a601dd1c3988f1fbdd3185281e9d2263`
- 位置：`cli/lib/cases/content-lint.ts:972-991`
- 证据：`hasPreviousDate` 会命中 `date_sub(current_date(), 1)`；随后 `hasCurrentDate` 的宽泛正则又命中同一子表达式中的 `current_date`。固定快照中只创建分区表并写入前一日分区、完全没有当日 INSERT，`case_partition_fixture` 仍返回零违规。
- 影响：要求“前一日和当日至少两个分区”的场景实际只准备一个分区，增量 / 分区扫描用例会缺少关键边界数据，而 lint 给出通过信号。
- lint / 测试缺口：正向测试同时包含前一日和当日表达式，没有“只有前一日”“只有当日”以及同一表达式重叠命中的负向测试。
- 建议修复：解析每条 INSERT 的分区值，分别收集前一日与当日目标；最低限度先从文本中移除已识别的前一日表达式，再搜索独立的当日表达式。新增只前一日、只当日、两个独立 INSERT 和不同方言日期函数回归。

## 16. 任意 `${...}` 都能冒充项目、数据源或数据库占位符

- 严重程度：高
- 引入提交：`8a601487a601dd1c3988f1fbdd3185281e9d2263`
- 位置：`cli/lib/cases/content-lint.ts:561-598`
- 证据：`addEnvironmentValue` 先检查当前 kind 的正式占位符正则，失败后又用通用的 `${任意内容}` 直接 return。固定快照中项目位置写 `${AnythingA}`、数据源位置写 `${ProjectA}`、数据库位置写 `${UserA}`，环境占位符 lint 均返回零违规。
- 影响：占位符只要长得像模板就能跨类型或拼错名称；运行时无法解析时才失败，甚至可能从错误的变量族取值，破坏项目 / 数据源隔离。
- lint / 测试缺口：测试覆盖硬编码值和正确占位符，但没有错拼名称、跨 kind 复用、未知变量以及前后拼接模板。
- 建议修复：发现完整 `${...}` 时必须验证它属于当前 kind 的 allow-list；未知或跨类型占位符应单独报错。对混合文本也应解析每个模板 token，而不是见到 `${` 就整体放行。新增 `${AnythingA}`、项目位置 `${DataSourceA}`、数据库位置 `${UserA}` 与多个 token 混排回归。

## 17. 同一物理行内给每段加编号即可绕过分号拆行规则

- 严重程度：中
- 引入提交：`8a601487a601dd1c3988f1fbdd3185281e9d2263`
- 位置：`cli/lib/cases/content-lint.ts:155-193`
- 证据：source lint 对含分号的一行拆段后，仅在至少一段没有 `N)` 前缀时阻断。因此 `1) 条件甲；2) 条件乙` 虽然两个条件仍在同一物理行，却因两段都有编号而返回零违规，直接违背错误文案中的“每个独立条件必须单独换行”。
- 影响：解析前本应保留的源格式硬闸可被最小文本变形规避；后续编号连续性检查也只看到单个字符串，无法保证每条条件可定位、可编辑。
- lint / 测试缺口：测试覆盖未编号分号串和引号内分号，没有“同一行的多个已编号条件”以及编号不连续的分号串。
- 建议修复：引号外出现结构性分号且分隔出多个非空段时就要求换行，不应因段首编号而放行；再分别校验拆行后的编号连续性。新增 `1)...；2)...`、`1)...; 3)...` 与引号内分号混排回归。

## 18. policy 的 `tracked: false` 只做类型校验，从未检查 Git 跟踪状态

- 严重程度：中
- 涉及提交：`90a361dc5711c7a9ed449afe52cf8e06e07312cb`
- 位置：`config/policies/repo-policy.yaml:64-80`、`cli/lib/repository-policy.ts:29-34`、`cli/lib/repository-policy.ts:66-87`、`cli/lib/repository-policy.ts:99-109`、`cli/lib/repository-policy.ts:380-424`
- 证据：policy 为 case export 和 automation 临时产物声明 `tracked: false`，loader 也验证该字段必须为 boolean；但路径收集把 cached 与 untracked 文件合并成一个字符串数组，后续检查完全没有读取 `rule.tracked`。固定快照中强制加入索引的 `workspace/repro/features/v1/f/cases/exports/tracked.xmind` 能被 `git ls-files` 确认为 tracked，`kata repo lint` 却不报告该文件。
- 影响：受控产物路由看似声明“不得进 Git”，实际无法阻止 XMind、运行临时文件等派生产物被提交；policy 文档与机械硬闸不一致。
- lint / 测试缺口：测试只验证字段类型和路径 / 扩展名，没有创建临时 Git 索引并分别覆盖 tracked、untracked、ignored、force-added 状态。
- 建议修复：路径枚举保留 `{ path, tracked }` 状态；命中 `tracked: false` 的规则且文件存在于 index 时直接违规。若支持 `tracked: true`，也要明确它表示“允许跟踪”还是“必须跟踪”，不要用同一 boolean 承担两种语义。新增真实临时仓库集成测试。

## 19. Playwright 忽略 `KATA_WORKSPACE_ROOT`，外部工作区永远发现不到测试

- 严重程度：高
- 涉及提交：`97bb70feceed433a1c3be54f3e9f3b8c736e76b1`
- 位置：`playwright.config.ts:99-111`；对照 `cli/lib/automation/playwright-run-path.ts:54-57`
- 证据：运行路径解析器明确以 `KATA_WORKSPACE_ROOT ?? <repo>/workspace` 解析 feature，但 Playwright `testMatch` / `testIgnore` 始终硬编码 `workspace/${project}/...`。固定快照在外部 workspace root 放置合法 `full.spec.ts`，设置 `KATA_WORKSPACE_ROOT`、`KATA_ACTIVE_PROJECT` 和 discovery 模式执行 `playwright test --list`，结果 exit 1、`No tests found`、`Total: 0`。
- 影响：CLI 可以定位外部 workspace 的 feature 和 run path，真正的 Playwright 收集却使用另一套根目录；外置工作区的 UI 自动化在执行前即丢失，形成“路径校验通过但无测试”的分裂合同。
- lint / 测试缺口：显式项目改造只测试项目参数与默认值，没有以外部 `KATA_WORKSPACE_ROOT` 放置 runner 并验证 discovery / execution 的端到端路径一致性。
- 建议修复：由同一个 workspace-root resolver 生成绝对 `testMatch`，或把 Playwright `testDir` 指向解析后的项目目录；run-path 校验、feature discovery 和 test discovery 必须共享同一根。新增外部 root 的 `--list` 集成测试，并断言只发现指定项目的 runner。

## 20. 文件生成脚本校验按语言硬编码，未按输出格式验证

- 严重程度：中
- 引入提交：`8a601487a601dd1c3988f1fbdd3185281e9d2263`
- 位置：`cli/lib/cases/content-lint.ts:383-421`、`cli/lib/cases/content-lint.ts:822-827`
- 证据：只要声明 Python，规则就无条件要求 `openpyxl Workbook` 与 `workbook.save`，因此使用标准库 `csv` 正确生成 CSV 会被报 `case_generator_scope`；反过来，声明 Shell 生成 XLSX 时只需 shebang、严格模式和 `output_file=`，用 `printf 'not-an-xlsx' > rows.xlsx` 也返回零违规。随后导入 fixture lint 因检测到“生成脚本”直接跳过。
- 影响：合法 CSV / SQL 生成脚本被误阻断，无效的 XLSX 伪文件却被当成完整 fixture；lint 既制造误报又给不可执行用例发放通过信号。
- lint / 测试缺口：没有语言 × 扩展名矩阵；尤其缺 Python CSV、Python SQL、Shell CSV、Shell SQL、Shell XLSX 以及伪扩展名内容。
- 建议修复：先按扩展名定义最小合同：XLSX 必须使用能创建真实 workbook 的实现，CSV 验证结构化行写入，SQL 验证输出文件与后续人工执行说明；语言只决定对应实现方式，不应一刀切。新增完整矩阵和至少一次实际执行后读取文件格式的集成验证。

## 21. 删除 `tags` 可以完全绕过首步骤导航层级校验

- 严重程度：中
- 引入提交：`8a601487a601dd1c3988f1fbdd3185281e9d2263`
- 位置：`cli/lib/cases/parse.ts:101-109`、`cli/lib/cases/content-lint.ts:799-820`、`tests/cli/cases-content-lint.test.ts:149-167`
- 证据：parser 将 `tags` 设计为可选；`lintNavigationTags` 又在 tags 缺失或空数组时立即返回。固定快照中首步骤为 `进入【数据质量 → 规则库配置】页面` 且完全不提供 tags，内容 lint 返回零违规。现有测试标题写“requires tags”，实际只检查了非空但前缀错误的数组。
- 影响：规则只能纠正“写错的 tags”，不能阻止作者直接删除字段；依赖 tags 的模块归类、检索、聚合或派生产物将失去导航层级。
- lint / 测试缺口：没有 tags 缺失、空数组和首步骤可解析但 tags 不存在的负向测试。
- 建议修复：首步骤匹配导航公式时，缺失或空 tags 必须产生 `case_tags_navigation`；若存在确实不需要 tags 的用例类型，应以明确类型或 allow-list 表达，而不是用缺字段隐式绕过。补齐 parse + lint 的真实 YAML 回归。

## 22. 只校验 CREATE 表名，其他 DDL / DML 可指向任意同数据库表

- 严重程度：高
- 引入提交：`8a601487a601dd1c3988f1fbdd3185281e9d2263`
- 位置：`cli/lib/cases/content-lint.ts:272-371`
- 证据：所有表引用先只检查是否形如同字母的 `${SchemaX}.<任意名称>`；只要存在 CREATE，后续稳定命名校验就仅使用 `createdTables` 的结果，不再检查 INSERT、DROP、ALTER、UPDATE、DELETE 等目标名。固定快照中先创建规范的 `${SchemaA}.test_table_16178_c0001`，再向 `${SchemaA}.arbitrary_table` INSERT，`case_sql_table_name` 返回零违规。
- 影响：增加一个规范 CREATE 即可掩护对同数据库任意表的写入；同一缺口也覆盖 DROP、DELETE、UPDATE 等被 `tableReferences` 识别的操作，可能让测试 SQL 触碰共享或业务表，而稳定测试表硬闸仍显示通过。
- lint / 测试缺口：测试只检查 CREATE 名称和数据库限定，没有“规范 CREATE + 非规范 DML / DDL 目标”的混合引用矩阵。
- 建议修复：按操作类型校验每一个表引用，而不是在存在 CREATE 时丢弃其他引用；所有写目标必须符合当前 case 的稳定命名族。确有只读外部源表需求时，单独定义可审计的只读引用规则，绝不能放行 DROP / ALTER / UPDATE / DELETE。新增每种语句的混合目标回归。

## 23. 未加引号的中文业务实例不进入占位符检查

- 严重程度：中
- 涉及提交：`8a601487a601dd1c3988f1fbdd3185281e9d2263`、`fd5f7831a5cc7bb5666ec1ea67f341bf6a3c485d`
- 位置：`cli/lib/cases/content-lint.ts:441-445`、`cli/lib/cases/content-lint.ts:448-505`、`cli/lib/cases/content-lint.ts:759-797`
- 证据：业务值正则对带引号内容允许任意字符，但不带引号的分支只接受 `[A-Za-z][A-Za-z0-9_-]*`。固定快照中 `使用账号 张三 登录` 返回零 `case_business_placeholders` 违规；写成带引号的 `使用账号「张三」登录` 才会命中。
- 影响：中文租户、用户、目录、标准、规则集、任务等最常见的硬编码实例只需省略引号即可绕过语义占位符规则，跨环境复用仍会在运行时失败或污染固定数据。
- lint / 测试缺口：现有业务实例测试主要使用引号或英文 token，没有无引号中文、数字开头、Unicode 名称以及中英文混合实例。
- 建议修复：按上下文后的分隔符提取 Unicode 值，并在剔除状态词 / 通用名词后统一走占位符判定；可使用 Unicode property escape，但必须限制到空白、标点或动作词边界，避免吞掉整句。新增无引号中文及混合名称回归。
