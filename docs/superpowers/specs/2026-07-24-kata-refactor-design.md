# Kata 测试项目彻底重构设计

- 日期：2026-07-24
- 状态：待用户复核
- 范围：整个 kata 仓库（Skill 体系、CLI、Workspace、测试、双端维护）

---

## 1. 现状问题

本项目从「Skill + Scripts」的极简架构，经多轮迭代演化为严重过度工程化的系统。事实盘点（六路并行调研，全部可复核）：

| 层 | 规模 | 真正干活的 |
|---|---|---|
| Skill Markdown | ~6500 行 | ~30%，其余为重复与事故化石 |
| CLI | ~25000 行 TS、21 公开 noun / ~90 verb + 17 隐藏 noun | Skill 流程真实依赖仅 20 个 verb；45+ verb 全仓零引用 |
| JSON Schema | 11 个 + 注册表 | 外部消费者为 0；WorkerStatusEnvelope 无任何代码引用 |
| lint | 22 实现 + 24 测试 | 防真实错误约 5 条，其余查措辞/同构/注释 |
| 测试 | 152 文件 / 26400 行（源码 17307，比 1.5:1） | ~55% 测真实行为；30% 钉 prompt 措辞；15% 已完成迁移的验尸报告 |
| workspace | 998 文件 / 65MB / 63 feature 目录 | 4 代际结构、4 套路径约定并存 |
| docs | 现存 3 文件 | git 历史已删 docs 145 个、已删测试 97 个（两轮推倒重建的化石） |

核心病灶：**为「AI 会不听话」建了一套自我服务的审计体系**。一条规则平均存在 3 份（CLAUDE.md/rules → SKILL.md/phases → lint 正则），再写 lint 查三份是否漂移（runtime-workflow.ts 硬编码 7 个中文短语必须逐字出现）。检查器代码（lint/ 2648 行）已超过被检查的全部 Skill Markdown 总量。

代表性实证：

- 同一条完成标准（full.spec 通过 + Allure + 平台业务记录）写在 9 个地方。
- 「认证只走 runtime resolver」在 12 个文件重复；directory-structure.md 自称「单一权威，不得重复定义」然后被重复 8 次。
- `kata <noun> <verb> --help` 全部已坏，200+ 测试无一覆盖。
- `run-tests-notify` 被真实引用却被公开命令白名单隐藏——白名单与依赖脱节。
- 12 个 phase 编号乱序（§10→§12→§11），且被 lint 焊死，不改 lint 就无法精简流程。
- 双 reviewer 中 spec-reviewer 自认「机械判定以 CLI exit-code 为准」，存在意义只剩 10 行 checklist。
- `_shared/*`（知识库/页对象/规则）整体不被 git 跟踪——业务资产裸奔，是最大单项风险。

## 2. 设计目标

1. **可理解**：项目拥有者能在一个下午读完并看懂全部 Skill 与 CLI。
2. **可修改**：改一条规则只改一处；新增/修改一个功能不需要同步维护多层定义。
3. **产物位置唯一**：每类产物有且仅有一个约定落点，CLI 强制，Skill 不得自拼。
4. **用例单源**：cases.yaml 为唯一正式源，其余格式单向派生，消灭双向同步。
5. **知识闭环**：任务开始自动注入相关知识，任务结束按置信度自动沉淀。
6. **双端原生**：Codex 与 Claude 两套 Skill 完全独立、按各自模型特点编写，业务判断一致。

## 3. 非目标

- 不建自研 AI 工作流平台（无合同 DSL、无状态机、无 Event Journal/Blackboard/Projection）。
- 不为「未来可能的插件生态」预付架构税（删 plugin-loader、摘 dtstack 包）。
- 不追求所有 Skill 目录同构（按需建目录，不造空目录）。
- 不保留任何旧架构兼容层、双写、alias（一次性切换，git 历史兜底）。
- 不写 PRD（本设计文档即决策依据，无业务目标冲突）。
- 不重写 lib/db、lib/playwright、integrations 的真实业务逻辑（保留并搬迁）。

## 4. 架构选项及选择

| 选项 | 目录规模 | 核心概念 | 优点 | 缺点 | 实施 | 日常成本 | 推荐 |
|---|---|---|---|---|---|---|---|
| **极简架构** | 6 Skill + 薄 CLI(~20 verb) | 删全部合同/Schema/双 reviewer/隐藏命令；lint ~5 条；测试 ~60 | 改一处即生效；可读性最高 | 产物质量靠 prompt + 少量 CLI 门 | ~1 周 | 最低 | ★ 选定 |
| 适度机器合同 | 同上 + 3-4 个 Schema | 保留 cases.yaml/handoff/metadata 的机器校验 | 产物质量多一层保障 | 维护 schema+lint 双层 | ~1.5 周 | 中 | 备选 |
| 保留平台化只清垃圾 | 现状 | 不动 contract/lint 体系 | 无重构风险 | 病灶未除 | ~2 天 | 高 | 不推荐 |

**选择：极简架构。** 理由：审阅证明现有合同体系 70% 在审计自己；OpenAI 与 Anthropic 官方均明确「leaner prompts 反而更准」「模型理解 why 比背 MUST 有效」「机械约束交给代码」。用例正式源（cases.yaml）的机器校验作为「决定真实执行范围 + 多程序消费」的唯一例外保留——它不是装饰合同，是数据本身。

## 5. 最终目录

见第 6~9 节与「阶段 4 目标目录树」。三层：根（双端原生分离）→ `cli/`（唯一工具箱）→ `workspace/`（业务资产）。

## 6. 6 个 Skill 的职责

| Skill | 职责 | 输入 | 输出 |
|---|---|---|---|
| **case** | 用例全生命周期：依需求源起草、编辑/转换/标准化既有用例、依 bug 生成 hotfix 回归用例 | 需求源（Lanhu/Axure URL、PRD、截图、描述）/ 用例文件 / bug ID 或 URL | `cases/需求名.yaml`（正式源）+ `需求名.xmind` + `exports/` |
| **ui-automation** | 把用例转为可真实跑通的 Playwright UI 自动化并修复 | feature 目录 / MD 用例 / 失败结果 | `automation/tests/**` + `runs/<id>/` 运行证据 + handoff.md |
| **defect-analyze** | 证据→报告：bug 堆栈、合并冲突、diff 扫描三模式分诊 | 异常堆栈 / 冲突文本 / 分支对 | `analyses/<type>-<slug>/report.md` |
| **infra-diagnose** | 数据源/服务器连通性故障的 SSH 排查与修复 | 报错文本、主机、JDBC URL | 根因结论 + 写入 knowledge/ 的排查知识 |
| **knowledge** | 业务知识/规则/术语的查询与维护；并向其它 Skill 自动注入 | 术语/规则描述/「XX 是什么」 | `knowledge/**`（带 confidence 状态） |
| **workspace** | 工作区生命周期：创建/检查/修复项目骨架（原 workspace-manage 瘦身，帮助并入 CLI） | 项目名 | `workspace/<project>/` 骨架 |

**Skill 重划说明**：case-draft/edit/hotfix 三合一为 `case`（共享同一用例格式与流水线，消除路由踢皮球与规则三处重复）；playwright-automation 改名 `ui-automation`（名实相符）；workspace-manage 删帮助职责（归 `kata --help` 与 CLAUDE.md），瘦身保留骨架管理。infra-diagnose 的知识存储统一进 `knowledge/`（删 `.kata/infra/` 平行体系）。

## 7. 各 Skill 输入

- **case**：① 需求源（URL/PRD/截图/描述）→ 起草；② 既有用例文件（.yaml/.md/.xmind/.csv/.xlsx）→ 编辑/转换；③ bug ID / ZenTao bug-view URL / 缺陷描述 → hotfix。路由按输入类型分流，不拆 skill。
- **ui-automation**：feature 目录路径/目录名（必填）；环境名（缺则先经环境确认协议）。
- **defect-analyze**：异常堆栈/console/HTTP 失败 / 带冲突标记文本 / diff 或分支对。
- **infra-diagnose**：连通性报错（JDBC No route to host 等）。
- **knowledge**：业务术语、规则描述、概念提问；或被其它 Skill 在任务开始/结束时自动调用。
- **workspace**：项目名 + 初始化/检查意图。

## 8. 各 Skill 输出

- **case**：`需求名.yaml`（必）+ `需求名.xmind`（必）+ `exports/需求名.{md,csv,xlsx}`（md 必，csv/xlsx 按需）。阻塞时产 `exports/confirmation.md` 草稿并在对话说明缺口。
- **ui-automation**：`automation/tests/cases/*.spec.ts`、`runners/{smoke,full}.spec.ts`、`pages/`、`fixtures/`、`sql/`；运行后 `runs/<run-id>/{allure-results,screenshots,trace,logs,handoff.md}`。
- **defect-analyze**：`analyses/bug-<id>/report.md`、`analyses/conflict-<slug>/report.md`、`analyses/scan-<slug>/report.md`。
- **infra-diagnose**：对话给出根因；可复用结论写入 `knowledge/pitfalls/`。
- **knowledge**：`knowledge/{overview,terms}.md`、`modules/`、`sites/`、`pitfalls/`。
- **workspace**：项目骨架目录 + `project.json`。

## 9. 各 Skill 产物路径（最高优先级）

**唯一约定，CLI 强制：**

```
workspace/<project>/
├── features/<版本目录>/<【vXXX】【客户】【模块】需求名>/
│   ├── prd.md                      # 规范化产品说明
│   ├── metadata.yaml               # 单版本元数据
│   ├── inputs/{snapshots,attachments}/
│   ├── cases/
│   │   ├── 需求名.yaml             # ★ 唯一正式源(必)
│   │   ├── 需求名.xmind            # 派生物(必)
│   │   └── exports/需求名.{md,csv,xlsx}  # 派生物(md必,余按需)
│   ├── automation/{tests,pages,fixtures,sql}/
│   └── runs/<run-id>/{logs,screenshots,trace,allure-results,downloads,handoff.md}
├── features/_hotfix/<yyyymm>-<slug>/   # hotfix 用例,同 cases/ 结构
├── analyses/<type>-<slug>/         # 缺陷/冲突/扫描报告
├── knowledge/                      # 知识库(进 git)
├── _shared/{pages,helpers,fixtures,rules}/
└── .cache/                         # 本地临时(gitignore)
```

- 运行证据唯一落点 `runs/<run-id>/`，消灭 `.runs/`、`tests/.runs/`、`.debug/`、`.temp/` 四种变体。
- `.process/` 删除；证据关联内联进 cases.yaml 的 `source` 字段。
- 文件名统一为**需求名**（去掉【vXXX】【客户】【模块】前缀，前缀只在目录名上）。
- 路径由 CLI 的 `PathPolicy` 计算与校验；Skill 只声明意图（「这是本 feature 的用例」），不拼路径。

## 10. Skill Prompt 规范

依据官方调研（OpenAI GPT-5.2/5.6 指南、Anthropic skill-creator 与 agent-skills-spec）：

1. **SKILL.md < 200 行**（官方上限 500，我们取更严）；超出的细节移入 workflows/references 按需加载。
2. **每条规则只写一次**，写在唯一权威位置；需要解释「为什么」而非堆 MUST。
3. **无黑话**：删「证据分层/外部事实/权威细则/完成门禁/落盘/兜底/回读/移交/Envelope/工件契约@N」等自造词汇；用平实中文。
4. **无事故化石**：不为单次事故写 overfit 规则；可复用的踩坑进 knowledge/，不进流程定义。
5. **无重复**：完成标准、约束在 SKILL.md 写一次，references 不重复。
6. **few-shot**：每 skill 至多一份高质量样例，放 `examples/`。
7. **机械约束全交 CLI**：prompt 只说「修完 `kata cases lint` 再继续」，不复述 lint 查什么。
8. **不固定模型名/subagent 数量/阶段数**（违反 CLAUDE.md 明文约束）。
9. **description 含 what + when**（触发机制），正文不再塞路由表。
10. 子代理提示词放 `prompts/`，用纯中文对话，删 Envelope/Schema 协议。

## 11. Codex 与 Claude 的独立维护

- `.agents/skills/**`（Codex）与 `.claude/skills/**`（Claude）完全独立的真实目录，不 symlink、不共享 `_shared` prompt。
- 删 `using-kata-codex`、删 runtime sync/detach/projection、删 codex-skill-shape 等双端 lint。
- 两套按各自模型特点编写（Codex 依 GPT-5.6 指南偏「目标+完成标准+少量约束」；Claude 依 Anthropic 指南偏「职责+why+渐进加载」），表达可不同。
- **一致性靠业务行为而非文本同步**：用相同业务 fixture（同一需求源 → 两端产出的 cases.yaml 语义等价、落点一致、通过同一 CLI 校验）验证最终行为一致，不逐字比对 prompt。
- 不在任何一端写固定模型名、固定 subagent 数量、不存在的工具名。

## 12. CLI 命令与输出规范

从 ~90 verb 砍到 ~12 noun / ~25 verb。**Skill 流程真实依赖的命令全部保留，零引用命令全删。**

保留的命令树：

```
kata features resolve|list|show          # 定位/列举 feature(中文目录协议)
kata cases build|export|lint|validate|verify  # yaml→派生物(build)/导出 csv,xlsx(export)/检查
kata xmind generate                      # 由 cases.yaml 生成 xmind
kata runs new|path|prune                 # 运行目录分配/定位/清理
kata handoff render                      # 渲染交付报告
kata automation scaffold|normalize       # 自动化骨架
kata knowledge read|write|index          # 知识读写与索引重建
kata repos sync-env|show|grep|list       # 只读源码查询
kata scans create|render                 # diff 扫描报告
kata defects render                      # bug/冲突报告
kata env list|show|doctor|run|cookie     # 环境管理(硬依赖)
kata project scan|create                 # 工作区骨架
kata integrations lanhu|zentao|notify    # 外部集成(去 loader)
```

**删除**：17 个隐藏 noun 全删（discuss 12-verb CRUD、case-signal/strategy 流水线、test-case-flow、auto-fixer、format-report-locator、prd-frontmatter、search-filter、writer-context-builder、report-to-pdf、plugin-loader、source-ref、case-draft start 等）；xmind 的 search/show/patch/add/delete；scans 6 个 CRUD；knowledge 的 update/verify/lint/history/rollback；features 的 create/index/lint/clean/archive/migrate；results publish；cases compare/e2e 及独立的 convert（并入 build/export）；safety/rules/agents/paths/skills 五个审计 noun（或合并为一个 `kata check`）；env 的 add/discover/migrate-dataassets/set。

**输出规范**（保留现有合理约定）：stdout 只输出请求的数据，诊断/进度写 stderr；机器模式输出单个稳定 JSON；破坏性操作默认 dry-run 需显式开关。修复 verb 级 `--help` 冒泡 bug（删 localizeHelp 用 commander 默认）。

## 13. 用例正式源与导出关系

**cases.yaml 是唯一正式源**，其余全部单向派生：

```
cases/需求名.yaml  ──kata cases build──┬──> cases/需求名.xmind   (必)
        │                              └──> exports/需求名.md     (必)
        └──kata cases export --to csv/xlsx──> exports/需求名.{csv,xlsx}  (按需)
```

- **编辑只改 yaml**，重新 build 派生物；派生物带「由 build 生成，勿手改」头注，永不手改。双向同步问题结构性消失。
- `case_count` 一致性、用例数与 xmind 节点数一致性等 lint 因结构保证而自然消亡。
- cases.yaml 结构（核心字段）：`meta{title,version,source,feature_id}` + `cases[]: {id,title,priority,precondition,steps[{action,expected}],tags,source_ref}`。source_ref 内联证据关联，替代 .process/ 三件套。
- ui-automation 直接解析 yaml（比解析 Markdown 健壮）；`kata cases build` 同时是自动化任务的输入清单来源（替代 build-case-tasks）。
- 迁移：写一次性转换器从现有 archive.md 解析为 yaml（不进 CLI 主命令面）。

## 14. Playwright Suite

- `automation/tests/cases/<case-slug>.spec.ts`：单条用例脚本。
- `automation/tests/runners/{smoke,full}.spec.ts`：冒烟与全量 runner。
- 页面对象：本 feature 私有 → `automation/pages/`；跨 feature 共享 → `_shared/pages/`。
- fixture：本 feature → `automation/fixtures/`；共享 → `_shared/fixtures/`。
- 运行时 SQL：本 feature → `automation/sql/`；共享多数据源工具 → `lib/db/`。
- 删可追溯头四行注释 lint（格式拜物）；用例与脚本的关联由 cases.yaml 的 id 与 spec 文件名约定表达。

## 15. Run 结果

- 每次运行由 `kata runs new` 分配 `runs/<run-id>/`，run-id = `YYYYMMDD-HHmm-<purpose>`。
- 全部证据落该目录：logs、screenshots、trace、allure-results、downloads、handoff.md。
- handoff.md 由 `kata handoff render` 从结构化结果渲染；删 double-track lint（json+md 双写），只留 md 一份给人看。
- **完成标准**（写在 ui-automation SKILL.md 一次）：目标 full.spec 通过 + run 目录有 Allure 结果 + 平台产生该用例核心业务记录。只读合同脚本仅在用户明确要求时算完成。
- Allure 失败不得标记为通过；零用例不得成功（CLI 校验）。

## 16. Knowledge 自动闭环

**任务开始前**：业务 Skill 自动调 `kata knowledge read`（按项目/模块/错误关键词检索），把精简后的相关知识注入上下文；用户无需主动说「查知识库」。只注入命中条目，不加载整个库。

**任务完成后**：产生可复用结论时自动写入，按置信度分级（简化为用户指定的四态）：

```
verified    用户确认/源码证据/真实复测支持 → 自动写入
observed    单次观察、未复测 → 自动写入但标记,待后续确认升级
conflicting 与现有知识冲突 → 标记并请用户裁决
deprecated  已失效 → 标记保留(不删,防旧知识复活)
```

- 敏感信息（明文密码/Cookie/Token/生产数据/未脱敏日志）须经用户确认才写入，否则脱敏写入。
- 高置信（如环境排查记录）直接写；低置信整理后向用户确认再写。
- 一次查询不产生四五个 JSON 过程文件；无新知识则零写入。
- `kata knowledge index` 重建索引；知识文件用 YAML frontmatter（title/type/tags/status/source/updated）+ Markdown 正文，git 管理历史。
- knowledge 既是用户可调用的 skill，也是其它 skill 的自动基础能力；infra-diagnose 的排查知识统一存这里（删 `.kata/infra/` 平行体系）。

## 17. Workspace 迁移

迁移前重新冻结基线（不沿用旧报告数字）。当前盘点：998 文件 / 65MB / 63 feature 目录。

**处置清单**（每类有明确动作）：

| 类别 | 数量 | 动作 |
|---|---|---|
| .DS_Store | 28 | 删 |
| 空目录 | 13 | 删 |
| 寄生 `workspace/features/` 错位树 | 1（2 文件） | 删 |
| 游离 `features/202607-v6411-ui-sort-qzmkxjrp/` | 1 | 删 |
| 误建空 feature「规则sql合并」 | 1 | 删 |
| 字节级重复 PNG | 130 文件/27 组 | 引入共享截图池 `_shared/snapshots/` 或按需去重 |
| knowledge/.history/*.bak | 6 | 删（git 兜底） |
| v647 空壳 feature | 17 | 逐个判定（见下） |
| 代际 A/B/C/D 结构 | 58 feature | 归一到统一骨架 |
| inputs 子目录 4 种命名 | 33 处 | 归一为 snapshots/attachments |
| `_shared/*` 未进 git | 170 文件 | 进 git（知识/页对象/规则/fixtures） |
| archive.md → cases.yaml | 40 份 | 一次性转换器转换 |
| analyses 归位 | 若干 | 从 _shared/archive 迁入 analyses/ |

**v647 空壳判定**（已用 1363 条验收用例核对）：
- 确认覆盖可删（8）：多表数据一致性比对、任务时长限制、单调递减递增、每表规则集管理、编辑分区信息、Spark 调参、时效性两/同字段时间差、规则库自定义SQL模版。
- 疑似覆盖待确认（2）：内置规则增加规则项、一个表支持多个规则任务。
- 疑似未覆盖待确认（7）：产品名称修改、单表字段计算关系、多表字段大小计算、报告字段维度范围、控制每个规则开关、控制规则开关影响任务运行、一个表支持多个规则任务。

**迁移实施**：
- 提供 `kata migrate --dry-run`：输出旧路径→新路径映射、源文件哈希、冲突检查、未处理文件计数；失败整体停止。
- 不设计迁移状态机；迁移是一次性脚本，完成后从代码库移除。
- 通过 git 提交回滚，不在新代码里保留旧目录兼容。
- 全部业务资产迁移并验证后，再删旧目录。

## 18. 测试体系

**保留/重写（真行为测试，~60 个）**：
- CLI 参数与输出（真跑命令、断言退出码与产物）
- 路径边界（PathPolicy：越界写入被拒）
- 原子写（AtomicWriter：半写状态不留残）
- cases.yaml ↔ md/xmind/csv/xlsx 转换
- 用例解析（从 archive.md 迁移到 yaml 的解析器）
- Suite 选择（smoke/full runner 生成）
- Playwright 结果统计（allure-stats）
- Knowledge 检索与去重
- 真实集成接口（lanhu/zentao/notify 的 fixture 测试）
- workspace 自动化 TS（lib/db、lib/playwright、lib/dataassets）
- Skill 行为 fixture（同一需求源 → 双端产出语义等价）
- 零用例不能成功；Allure 失败不能标记为通过

**删除（~90 个）**：检查 prompt 措辞（completion-contract、runtime-workflow、strategy-templates）、结构同构（skill-structure/shape、codex-skill-shape、agent-naming）、一次性迁移快照（dead-code-cleanup、security-command-hardening、esm-modules、space-separated-style、config-examples）、e2e 全套（fixture 自比恒真、伪造 CLI）、双端 expected 目录、为已删兼容层存在的测试、为无消费者 Schema 存在的 fixture。

**CI**：砍 gitignore-no-bloat、features-index 两个执念 job；lint 类合并为一步；保留 biome + type-check + bun test + 真行为集成测试。

## 19. 删除清单

**概念层**：contract DSL、owner_kinds、operations 合同、canonical/derived/run_outputs 角色、preflight/postflight hooks、handoff_events、completion_rules 状态机、Event Journal、Blackboard、Phase Dispatcher、Projection Inventory/Lock、Schema Registry、Worker/Reviewer/Handoff 等内部过程 Schema、无消费者的 Manifest。

**代码层**：17 个隐藏 noun（~4000 行）、45+ 零引用 verb、11 个 Schema 中的 8 个、22 条 lint 中的 ~17 条、2 个 PreToolUse hooks、plugin-loader/plugin-utils、dtstack 独立包（降级为模块）、.process/ 全套、enhanced-doc-store、discuss CRUD、双 reviewer 中冗余的一份、双端 symlink 与 using-kata-codex、_shared prompt 目录、5 个 rules 文件中的 4 个（git-workflow/repo-readonly/testing/workspace-boundary 并入 CLAUDE.md，comments 并入 CONTRIBUTING）。

**文档层**：docs/contracts、CODEX-SKILLS.md（撒谎文档）、历史 plan/spec/审查/迁移/交接文档（git 历史兜底）、CHANGELOG 虚空引用、CODE_OF_CONDUCT（个人项目）。

**兼容层**：旧目录兼容、旧命令 alias、旧 Schema 兼容（@1/@2 双轨收敛为单版本）、已完成迁移的防回归测试。

## 20. 风险与回滚

| 风险 | 缓解 |
|---|---|
| 删掉的某命令/Schema 实际有隐藏消费者 | 删前全仓 grep（含 workspace、git log）确认零引用；在 worktree 分支操作 |
| 产物质量因删 lint 失控 | 保留防真实错误的 5 条 lint + 三条 CLI 门（lint/validate/verify）；重构后观察 1-2 周再决定是否补 |
| cases.yaml 转换丢失 archive.md 信息 | 转换器 + 抽样人工核对 + 保留原 archive.md 至迁移验证通过 |
| _shared 进 git 引入大文件/敏感信息 | 先进知识/页对象/规则/fixtures（文本为主），screenshots 等大二进制仍 ignore |
| 双端 prompt 漂移导致行为不一致 | 业务 fixture 测试（同一输入两端产出语义等价）|
| 迁移中断 | dry-run + 失败整体停止 + git 回滚；不动原文件直到验证通过 |
| 回滚 | 全部在 `codex/kata-refactor` worktree 分支进行；main 不动；失败 `git worktree remove` + 删分支即可 |

## 21. 验收标准

1. 项目拥有者能在一个下午读完 6 个 SKILL.md + cli/README，并说清每个 skill 的输入/输出/落点。
2. 任意一类产物只有一个约定落点；`kata runs new` 之外不存在运行证据的第二种写法。
3. 修改用例只编辑 cases.yaml，build 后派生物自动更新；不存在需要手改两个文件的操作。
4. CLI verb 数 ≤ 25，全部 `--help` 可用，零引用命令为 0。
5. 测试套件全绿，且其中无「断言 prompt 措辞/结构同构」的测试；测试/源码比 < 1:1。
6. 任务开始时相关知识自动出现在上下文；任务结束的可复用结论按四态自动/确认写入 knowledge/。
7. `_shared` 的知识/页对象/规则/fixtures 纳入 git，`git log` 可见知识演进。
8. Codex 与 Claude 两端对同一需求源产出语义等价的 cases.yaml（fixture 测试通过）。
9. 完整跑通一次 case（起草→编辑）与一次 ui-automation（生成→跑通→交付）真实流程。
10. 仓库中不存在任何「为检查器而存在」的文件。

## 22. 后续任务级 Plan 拆分建议

按依赖序拆为 6 个可独立交付的任务（每个独立 worktree 分支）：

1. **T1 基座**：建 `cli/` 骨架（PathPolicy/WorkspaceLocator/AtomicWriter）+ 迁移真实 CLI 命令 + 删审计衙门。产出：薄 CLI 可用，`bun test` 绿。
2. **T2 Workspace 迁移**：冻结基线 → dry-run → 结构归一 + 去重 + 清垃圾 + _shared 进 git + archive→yaml 转换器。产出：统一 workspace，git 可回滚。
3. **T3 用例单源**：cases.yaml schema + `kata cases build/export` + 派生物流水线。产出：用例只改 yaml。
4. **T4 六个 Skill 重写**：按 prompt 规范重写（先 Claude 端，再按业务等价写 Codex 端）。产出：6×2 个原生 skill。
5. **T5 Knowledge 闭环**：knowledge read/write/index + 自动注入/沉淀 + 四态。产出：闭环可用。
6. **T6 测试与文档清理**：删 ~90 测试、留 ~60、重整 CI；清历史文档；更新 README/INSTALL。产出：测试 < 源码、CI 精简。

依赖：T1 → (T2, T3) → T4 → T5 → T6。T2 与 T3 可并行；T4 依赖 T3（用例格式）；T6 最后收尾。

每个任务遵循仓库 worktree 工作流：`git worktree add -b codex/<slug> .worktrees/<slug> main`，完成后 `git merge --no-ff`，不自动 push。
