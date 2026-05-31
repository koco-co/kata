# kata Skill 体系优化 Goal（单任务，交给 Codex 一个窗口执行）

一个任务、一个 Codex 窗口、一个 worktree 跑完全部：

理解并 E2E 真跑现有 8 个 skill（建立行为基线）→ 优化 `.claude/` 全部提示词 → 适配到 codex 体系(`.agents`) →
适配后 E2E 验证对账 → 审计清理整个项目。完成后不合 main、不 push，交出 worktree + HEAD SHA 由用户自检合入。

## 角色与最高约束

你是资深 agent runtime 工程师 + 提示词工程师 + 代码审计工程师，用 update_plan 维护可视化任务列表，
分阶段推进、不跳步、不颠倒顺序。
【最高约束】全程在一个 detached worktree 内工作，完成后绝不合入 main、绝不 push；最终交出
worktree 绝对路径 + HEAD SHA，由用户自行检查后合入。

## 文案规则（凡写/改提示词处一律遵守，强制）

用自然、好读的母语中文写提示词，禁翻译腔与行话黑话。判据：中文母语开发者读着顺、不别扭、不用在脑子里二次翻译。

- 本项目现成反例：playwright-automation 的「覆盖忠实度」——换成正常说法，如「用例照原样实现、不简化、不打折扣」。凡此类生造词、直译词一律换掉。
- 目标是「读起来像人话」，不是把英文规范直译成中文。
- 这条贯穿阶段2 优化 .claude、阶段4 写 codex 版、阶段6 改路径文案，及任何动到文字处。

## 执行顺序（硬约束，不可颠倒）

阶段1 理解 + E2E 真跑现状 .claude 8 skill（建立行为基线 ground truth）
  → 阶段2 优化 .claude 全部提示词（只改写法、不改行为）
  → 阶段3 回归：重跑受影响 skill 的 E2E，确认行为没变（对比阶段1 基线）
  → 阶段4 适配 8 skill 到 codex 体系 .agents
  → 阶段5 适配后 E2E 真跑验证 + 与基线对账
  → 阶段6 逐目录逐文件逐函数审计清理（必须在阶段1-5 全部完成后才开始）

## 本次具体输入（开跑直接用这几个真实值）

- case-draft 的 Lanhu/Axure 输入（裸输入直接发它）：
  `https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=a58cd6d7-d125-4a54-a6a3-d46c132cecdf&docId=3d3ae6d5-092c-49db-a795-6a3f94f91593&docType=axure&pageId=d56489f6721345a6bf2732113beb4eca&image_id=3d3ae6d5-092c-49db-a795-6a3f94f91593&parentId=f37ceffc-4c19-4d3b-8d6a-3bbe49ae9dc8`
- case-hotfix 的 ZenTao 输入（裸输入直接发它）：`http://zenpms.dtstack.cn/zentao/bug-view-151624.html`
- playwright-automation 环境 profile：`local-ltqc.yaml`
  （开跑前确认该文件确在 `workspace/<project>/_shared/env/` 下；若不存在，核对实际文件名——也可能写作 `ltqc-local.yaml`——再用。）

## E2E 驱动机制（阶段1/3/5 通用，务必先读）

- 模型固定：`claude -p` 用 sonnet（加 `--model sonnet`）；`codex exec` 用 GPT-5.5（codex 的 `--model`/`-m` 指定）。
- `claude -p` 与 `codex exec` 都是非交互一次性模式：slash 形式 skill 仅交互可用，headless 下用「裸输入/
  描述任务」触发自动路由；且勿加 `--bare`（否则不加载 skill/CLAUDE.md/hooks，路由不触发）。
- 这 8 个 skill 深度依赖 AskUserQuestion（环境确认、模块消歧、批量索要证据等），而 headless 无真人答题位，
  `--allowedTools`/`--permission-mode` 只处理工具权限、不处理 AskUserQuestion 内容问题。
- 采用「Codex 模拟用户自驱动 + 预设答案集」：开跑前先做一次行为探针——用一个会触发 AskUserQuestion 的 skill
  在 `claude -p --model sonnet --output-format stream-json --input-format stream-json`（或 `--continue`/`--resume`）
  下试跑，确认 AskUserQuestion 能否作为事件浮现并被程序化回答：
  - 能 → 用 stream-json/多轮把「预设答案集」对应答案喂回去。
  - 不能 → 退到「参数前置绕过」：把预设答案作为上游参数/指令写进初始 prompt，触发各 skill 的显式 escape
    hatch（如 playwright-automation「已显式给 profile 或回复确认即直接执行」、case-draft 显式给 project/module
    跳过消歧），让 skill 不弹问也能按用户预设答案 E2E 跑完。
- 探针结论与最终采用的驱动方式写进报告。stream-json 仅用于旁路抓 transcript，不替代答题。

---

## 阶段 1 — 理解 + E2E 真跑现状 .claude（建立行为基线）

目标：先把现状摸透并跑通，留下「每个 skill 真实做什么」的事实基线，供阶段3 回归对比、阶段5 适配对账。
8 个 skill：case-draft、case-edit、case-hotfix、defect-analyze、infra-diagnose、knowledge-curate、
playwright-automation、workspace-manage。
步骤：

1. 通读每个 .claude/skills/<name>/SKILL.md 及其 references/ phases/ prompts/ rules/，弄清：触发条件、
   路由边界、编排工作流（阶段管线/Worker 派发/review）、硬规则、调用的 kata 脚本、会在哪些点弹 AskUserQuestion。
2. 按「E2E 驱动机制」用 `claude -p --model sonnet` 程序化多轮真跑每个 skill，输入用真实用户裸输入（Lanhu URL /
   bug ID / feature 目录路径 / 冲突文本），AskUserQuestion 用「预设答案集」回答或参数前置绕过。可链式复用产物
   （case-draft 产出的 archive.md 喂给 case-edit）。
3. 全部真跑——真实执行真实脚本与外部调用；开跑前按下方「凭据/环境/预设答案集」清单逐 skill 备齐，先查既有来源
   (.env.local、.kata/infra/credentials.yaml、.kata/auth/、现有 workspace feature 目录)，缺什么一次性批量
   向用户索要，齐了再开跑；不得静默跳过或伪造。
4. 为每个 skill 记录基线：输入形态 → 触发路由是否命中预期 skill → 编排过程（含每个 AskUserQuestion 点与所用
   预设答案）→ 输出产物（文件路径、内容格式/字段结构）、产物落盘位置、影响范围（写哪些目录、触碰哪些状态）、
   可优化点。这份基线落进交付物报告。

## 阶段 2 — 优化 .claude 全部提示词

目标：让 .claude 下全部 kata 自有提示词好读、规范、明确，用足 Claude Code 的 skill 机制（三级渐进加载）。
本项目只面向 Claude Code，不考虑其它 agent 兼容。

铁律（最高优先级）：只改写法和结构，不改约束含义。每条现有硬规则 / 边界 / 产物要求的意思必须 100% 保留；
只能拆句、理顺、补「为什么」、去重、统一用词，绝不能删掉或削弱任何一条真约束。拿不准某句是不是真约束，
就保留它、记进「存疑清单」，不擅自删。

适用范围：

- 改：`.claude/skills/**/*.md`（含每个 SKILL.md 及 references/ phases/ prompts/ rules/ fewshots/ 下全部 .md）、
  `.claude/prompt/_shared/*.md`、`.claude/rules/*.md`。
- 不碰：`.claude/plugins/**`（第三方）、`.claude/scripts/**`（代码）、所有 `*.hbs`/`*.ts`/`*.json`。

要落实的官方规范（Anthropic skill 最佳实践）：

1. description 是 skill 被发现的唯一稳定信号：第三人称，同时写清「做什么」和「什么时候用」，带关键词和触发
   场景，宁可写得主动些（模型容易漏触发）。别用第一人称。
2. 简洁：默认模型已经很懂，只补它不知道的；每句话都得值它占的篇幅。
3. SKILL.md 正文 ≤ 140 行（本项目 lint 上限，比官方 500 行更严）。
4. 按任务的脆弱程度给自由度：多种解法就给方向（自然语言步骤）；易错、必须按顺序，就给精确命令。
5. 指令写成祈使句，并说明「为什么」，让模型能推广到没写到的情况。
6. 渐进加载：引用只一层深（SKILL.md → 文件，别套娃）；超过 100 行的引用文件顶部加目录。
7. 路径一律正斜杠、写法统一；文件名见名知意。
8. 别写会过期的信息、别同义词混用、别一次给一大堆选项。

必须修掉的具体问题：

- P1 触发信息四处重复（description / when_to_use / 正文「路由边界」/ rules 路由表）：让 description 单独承载
  完整「做什么 + 何时用」；正文「路由边界」只留 description 说不清的「该改走哪个 skill」差异，不照抄。
- P2 when_to_use 字段：Claude Code 发现 skill 只看 name + description，这个字段没代码用到，是冗余。把它里独有
  的触发线索并进 description 后删掉该字段。（若有 lint/测试断言它必须存在，一并改到全绿。）
- P3 幽灵字段：`.claude/rules/routing-guard.md` 等处提到的 `must_trigger_when` / `must_not_trigger_when`，在任何
  SKILL.md 里都不存在。删掉这些说法，改写成真实的触发机制（靠 description 关键词 + 优先级）。
- P4 硬规则一句塞好几条：一个 bullet 塞 3–5 条规则加破折号转折（典型：case-draft 表单类那条、playwright
  「覆盖忠实度」那条），拆成一条一规则。
- P5 硬规则补「为什么」：关键约束补一句原因（参照已有好样板：hotfix「窄而准」、defect「合并会让修复方分不清
  现象和根因」）；不重要的保持简短。
- P6 超 100 行的引用文件加目录：cli-essentials.md(258)、hotfix-archive-format.md(216)、agent-spec-reviewer.md(172)、
  §1-case-normalize.md(158)、§2-env-preflight.md(150) 等。
- P7 跨 skill 绝对路径 + 转义残留：多个 skill 的「何时加载」表引用 `.claude/prompt/_shared/case-qa.md`（在 skill
  目录外），还有 `\_` 反斜杠残留。统一路径写法、清掉 `\_`，共享文件显式标明是「共享引用」。
- P8 章节骨架统一：以多数 skill 的「路由边界 / 工作流 / 何时加载哪个文件 / 硬规则 / 产物」为准，defect-analyze
  等偏离的对齐（没有支撑文件/产物的段可省）。
- P9 支撑文件语言统一：同一类提示词别中英混写（如 case-draft 的 agent-spec-reviewer.md 是英文、agent-worker.md
  是中文），统一成中文，按 `.claude/rules/comments.md` 的分界。
- P10 description 去噪：留住高价值触发词（域名、URL 形态、关键扩展名），删掉稀释信息的括注。

项目硬约束（碰了 CI 会红，改前先记牢）：

- frontmatter 字段白名单（claude）：name, description, allowed-tools, when_to_use, user-invocable,
  disable-model-invocation, argument-hint, model, effort, context, agent。别加白名单外的字段。
- 不动目录结构：保留现有 prompts/ phases/ scripts/ 等多目录，只改文件里的字和跨文件引用写法。
- 别加装饰性标记（emoji 徽章、[CONTRACT] 之类），有 lint 会拦。
- 改 case-draft 的硬规则措辞，会让 `case-draft-hardrules-regression.test.ts` 的数量 + SHA 基线失败，必须同步
  更新基线；`strategy-templates.test.ts` 同理。
- 文档跟实现对齐：改完后，rules / CLAUDE.md 里别再有指向已删字段或已删 .agents 的说法。

怎么改（每个文件）：读全文 → 列出违反规范的点 → 改（拆句、补原因、统一路径/用词、加目录、把 when_to_use 并进
description、删幽灵字段）→ 拿不准是不是真约束的句子，保留并记进存疑清单。
顺序：先 8 个 SKILL.md（收益最大）→ 再 references / phases / prompts → 最后 prompt/_shared 和 rules。

## 阶段 3 — 回归确认（优化没改变行为）

1. 重跑阶段2 改动涉及的 skill 的 E2E（输入、预设答案与阶段1 完全一致），与阶段1 基线逐项对比：触发路由、
   产物文件/格式/落盘位置、影响范围是否完全一致。
2. 出现任何行为漂移 = 优化把约束改坏了，回阶段2 在本 worktree 内修好再复跑，直到与基线一致。
3. 把回归结果写进报告。

## 阶段 4 — 适配 8 个 skill 到 codex 体系 (.agents)

目标：在 .agents 下建立 codex 版的 8 个 skill，充分发挥 codex-app 原生特性与功能；与 .claude 各自
独立维护（不强制 1:1 镜像，不考虑其它 agent 兼容）。写 codex 版提示词时严格遵守上面「文案规则」。
关键约束：

1. 脚本一律复用、不复制：codex skill 需要的脚本用 symlink 指向 .claude 下原件（如 `ln -s` 到
   .claude/scripts/_shared 或对应 .claude/skills/<id>/scripts）；绝不在 .agents 拷贝脚本副本。chassis 入口
   `.claude/scripts/_shared/bin/kata` 为两栈共享，codex skill 经 `kata <command>` 调用。
2. 先恢复 codex 契约认知（.agents 曾被退休删除，需重建）：
   - 看退休快照：`git show 155736def`（"remove .agents and AGENTS.md" 提交），及
     `git show 155736def^:.agents/...` 还原退休前的 .agents 目录结构与 openai.yaml 写法。
   - 读仍在代码里的 codex 契约：.claude/scripts/_shared/lib/skills/frontmatter-policy.ts
     （CODEX 字段白名单：name/description/allowed-tools/when_to_use/disable-model-invocation）、
     .claude/scripts/_shared/lint/skill-shape.ts（codex 的 S5/S6/S7 只允许 SKILL.md + references/；
     S9 禁 Claude-only 指令如 TaskCreate/AskUserQuestion/${CLAUDE_SKILL_DIR}/.claude/skills 路径/model: 行）、
     skill-audit.ts、runtime-sync.ts、runtime-detach.ts。
   - 结合 codex-app 当前真实能力（你最了解自己），用 codex 原生 skill/exec/配置机制实现，不照搬 CC 写法。
3. codex SKILL.md 必须过 codex 结构与字段 lint：只用 CODEX 白名单字段、只留 SKILL.md + references/、
   不含 Claude-only 指令。注意：codex 体系不能依赖 AskUserQuestion，交互点改用 codex 原生交互/参数机制实现。
4. 适配后跑：`bun run lint:skills:codex`、`kata skills audit --runtime codex`、`bun run lint:agents:codex`
   全绿。

## 阶段 5 — 适配后 E2E 真跑验证 + 对账

1. 按「E2E 驱动机制」用 `codex exec`（模型 GPT-5.5）程序化多轮真跑 .agents 适配后的 8 个 skill，输入与阶段1
   一致，交互点用同一套「预设答案集」或 codex 原生参数喂入。
2. 与阶段1 的基线逐项对账：触发路由是否一致、产物文件/格式/落盘位置是否一致、影响范围是否一致。
3. 差异分类记录：codex 原生特性带来的合理差异 vs 适配缺陷（缺陷必须在本 worktree 内修复并复跑至一致）。
4. 同样全部真跑、缺凭据/答案先索要、不纸面替代。

## 阶段 6 — 逐目录逐文件逐函数审计清理（前置完成后）

范围（纳入）：.claude/scripts/**、.claude/skills/**、.claude/rules/**、.claude/prompt/**、.claude/hooks/**、
新建的 .agents/**、根配置(package.json/tsconfig*/biome)、tools/**、docs/**。
排除：.claude/plugins/**（vendored）、workspace/**（含 .kata/repos/** 只读源仓库，只读不改）、
node_modules/、.worktrees/、各类运行时 *-report/ 目录。
要找出并处理的六类问题：

1) 孤儿文件 2) 孤儿/死函数与未使用导出 3) 无作用/冗余代码 4) 需优化或补充的文件/函数
5) 无效的文件路径引用（指向不存在文件） 6) 需优化的路径引用（硬编码绝对路径、`\_` 转义残留、相对/绝对不一致）。

处置尺度（安全即改、可疑只报）：

- 静态无引用且确认非入口/模板/fixture 的死代码与无效路径——直接删/修。
- 任何可能被「提示词字符串路径 / kata CLI 子命令 / handlebars 模板名 / 测试 fixture 路径 / symlink」
  动态或按名引用的文件——一律不删，写进报告「存疑清单」交用户裁决。

【关键防线·孤儿误判】判定任一文件为孤儿前，先 `git grep -n "<basename>"` 与 `git grep -n "<相对路径>"`
全仓搜（含 .md/.json/.hbs/.ts/symlink 目标），确认无字符串引用、无入口注册才可处理。
【特别注意】.agents 是本任务刚重建的活目录，其 symlink 目标、runtime-sync/runtime-detach/skill-audit
的 codex 分支、frontmatter-policy 的 CODEX 列等 codex runtime 工具均为活代码，不得当孤儿清理。
复用现成检测（不要重造）：`bun run type-check`、`bun run check`、`bun run check:skills`、
`bun run lint:debris`（check-stale-paths/runtime-artifacts/debug-files）、`kata paths audit`，并通读
.claude/scripts/_shared/lint/ 既有 lint（hardcode-path、path-treatment、owner-skill-dup、tests-layout 等）
对齐口径。机械初筛若 bunx 可用可跑 `bunx ts-prune`/`bunx knip`/`bunx madge --orphans`，结果须经上面防线交叉验证。
说明：.claude/skills 的提示词措辞已在阶段2 优化，本阶段不再重写其语义，只处理代码、路径引用与孤儿/死代码。

---

## 凭据 / 环境 / 预设答案集（阶段1/3/5 全真跑所需，开跑前先备齐）

按 skill 列出并核对，缺失一次性向用户索要：

- 凭据/环境：
  - case-draft：上面「本次具体输入」的 Lanhu/Axure URL + KATA_LANHU_COOKIE/KATA_LANHU_PASSWORD；目标 project。
  - case-edit：一个既有 .xmind/.csv/archive.md（可用 case-draft 产物链式复用）。
  - case-hotfix：上面「本次具体输入」的 ZenTao bug URL（bug-view-151624）+ KATA_ZENTAO_PASSWORD。
  - defect-analyze：异常堆栈/冲突文本/diff 样例（本地即可）。
  - infra-diagnose：可达 SSH 主机 + .kata/infra/credentials.yaml。
  - knowledge-curate：目标 project workspace（本地即可）。
  - playwright-automation：含用例的 feature 目录 + 环境 profile `local-ltqc.yaml`(KATA_TARGET_ENV) + 可达目标应用 + 浏览器依赖。
  - workspace-manage：本地即可。
- 预设答案集（每个 skill 的 AskUserQuestion 点对应的用户预设答案，用于自驱动/参数前置绕过），至少覆盖：
  - playwright-automation：env profile = `local-ltqc.yaml`。
  - case-draft：project / module（消歧）、表单字段证据缺口的处理选择。
  - case-edit：编辑诉求澄清的选择。
  - 其余 skill 凡会弹 AskUserQuestion 的点，逐一给出预设答案。

凭据放 .env.local / .kata，不写入入口文档或提示词。

## 通用约束

- worktree-first：若主树有未提交改动先 `git add -A && git commit -m "chore: 🧹 save pre-worktree local changes"`，
  再 `git worktree add --detach .worktrees/<slug> main`，全程在内工作；按需 symlink 必要 ignored runtime 目录
  (.kata 等)，.kata/repos/** 即使 symlink 共享也只读。
- 改后即测：每阶段改动后跑受影响测试，收尾跑全量 `bun test` + 上述 lint/audit；任何失败排根因修复，不得 skip/掩盖；
  确实超范围则停下说明交用户决定。
- commit 遵循固定 type/emoji：feat 🧩 / refactor ✨ / fix 🩹 / chore 🧹 / docs 📝 / test 🧪；description 小写、≤72 字符。
- 绝不合 main、绝不 push。

## 交付物（落 docs/）

1. docs/skills/2026-05-31-claude-prompt-optimization.md：逐文件 changelog（改了什么、对应哪条规范）+ 存疑清单
   （保留没删、要用户拍板的句子）+ 阶段3 回归结果。
2. docs/skills/2026-05-31-skill-e2e-and-codex-adaptation.md：8 个 skill 的作用、编排工作流、阶段1 E2E 行为基线、
   E2E 驱动机制探针结论、codex 适配方案与 symlink 清单、阶段5 对账结果（一致项/合理差异/已修缺陷）。
3. docs/audit/2026-05-31-codebase-orphan-and-path-audit.md：文件清单与作用、已改动（按六类分组，含确认无引用证据）、
   存疑清单、验证结果（命令/exit/pass/fail/skip）、未覆盖范围。
4. 最后输出 worktree 绝对路径 + HEAD SHA + 一句话总结，并声明「未合并 main、未 push，等待用户检查后自行合入」。
