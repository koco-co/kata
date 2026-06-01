# 把 kata 的 8 个 skill 适配到 codex（交给 codex 的提示词）

- 日期：2026-06-01
- 用法：把下方「提示词正文」整段复制给 codex（一个 codex 窗口 + 一个 worktree 跑完）。
- 与 `kata-skill-goals.md` 的关系：本文件取代旧 goal 的阶段 4（codex 适配）。旧 goal 的阶段 1-3（`.claude` 去黑话 + 官方规范重写）已完成并 push main；旧 goal 阶段 4 让 codex「从 git 还原 codex 契约门禁代码」的步骤**已失效**——那套契约（`frontmatter-policy.ts` 的 CODEX 白名单、`skill-shape.ts` 的 codex 规则、`--runtime codex`、`lint:skills:codex` / `lint:agents:codex`、`skill-audit.ts`）已随退休提交 `155736def` 删除。本文件改用「codex 原生 skill 机制重建 + 照搬 `.claude` 内容」，范围为适配（阶段 4）+ 适配后 E2E 对账（阶段 5），不做全库审计。

---

## 提示词正文

# 把 kata 的 8 个 skill 适配到 codex（单任务，一个 codex 窗口 + 一个 worktree 跑完）

## 你是谁 / 最高约束

- 你是资深 agent-runtime 工程师 + 提示词工程师。用 `update_plan` 维护可视任务列表，分阶段推进、不跳步、不颠倒顺序。
- **【最高约束】** 全程在一个 detached worktree 内工作；完成后**绝不合并 main、绝不 push**；最终交出 worktree 绝对路径 + HEAD SHA + 一句话总结，明确声明「未合并 main、未 push，等待用户检查后自行合入」。

## 背景（先读懂，避免踩旧坑）

- `.claude/skills/` 下有 8 个 skill：`case-draft`、`case-edit`、`case-hotfix`、`defect-analyze`、`infra-diagnose`、`knowledge-curate`、`playwright-automation`、`workspace-manage`（`_shared` 不是 skill，是共享 CLI / 库）。
- 这 8 个 skill 的 `.claude` 提示词刚做完「去黑话 + 对齐官方 Skill 规范」重写（已 push main），措辞已经干净、规范、语义确定。**本任务不重写 `.claude` 的提示词**，把它当作权威内容来源照搬。
- 历史上有过 codex 版 `.agents/` 目录，但已被退休删除（提交 `155736def`），且当时连 codex 的契约门禁代码（`frontmatter-policy.ts` 的 CODEX 字段白名单、`skill-shape.ts` 的 codex 规则、`--runtime codex` 选项、`lint:skills:codex` / `lint:agents:codex` 脚本、`skill-audit.ts`）也一并移除了。**不要去 git 历史还原那套 Claude 镜像式的 codex 契约**——本任务改用 codex 原生 skill 机制重建。

## 目标

用 **codex 自己原生支持的 skill 机制**（你最了解自己的能力：codex 的 skill / exec / 配置体系），把这 8 个 skill 在 codex 体系内重建一套，充分发挥 codex 原生特性。提示词内容**直接照搬** `.claude` 下已重写好的中文版本，不重新翻译、不改语义。codex 侧与 `.claude` 各自独立维护，**不要求 1:1 镜像**。

## 硬规则

1. **脚本只复用、不复制**：codex skill 需要的脚本一律用 symlink 指向 `.claude` 下原件（`.claude/scripts/_shared` 或对应 skill 的 `scripts/`）；绝不拷贝脚本副本。底盘入口 `.claude/scripts/_shared/bin/kata` 两栈共享，codex skill 经 `kata <command>` 调用。
2. **照搬内容、用 codex 原生形态承载**：提示词正文照搬 `.claude/skills/<name>/SKILL.md` 及其 `references/` `rules/` `prompts/` `phases/` `fewshots/` 的中文内容；用 codex 原生的 skill 结构 / 配置来组织，不照抄 Claude Code 的 frontmatter 字段和目录契约。
3. **交互点改造**：这 8 个 skill 在 `.claude` 里大量用 AskUserQuestion（环境确认、模块消歧、批量索要证据）。codex 体系没有 AskUserQuestion——改用 codex 原生的交互 / 参数机制承载这些决策点，保证「有真人时能问、headless 时能用参数前置绕过」。
4. **不动 `.claude` 与第三方**：`.claude/**`（含 `scripts`、`plugins`、已重写的 `skills`）是只读来源，不修改；只新建 codex 侧 skill 树 + 指向 `.claude` 的 symlink。`workspace/{project}/.kata/repos/**` 只读，即使 symlink 共享也不写。
5. **文案规则**：任何**新写**的 codex 侧文字（配置说明、原生机制衔接的胶水文案）用自然好读的母语中文，不要翻译腔、不要行话黑话（判据：中文母语开发者读着顺、不用脑内二次翻译；本项目反例「覆盖忠实度」应说成「用例照原样实现、不简化、不打折扣」）。照搬的 `.claude` 内容已合规，保持原样。
6. **CI 联动要警觉**：仓库现有 `bun run check:skills`（即 `kata skills sync-check`，检查 `.claude` 与 `.agents` 是否同步）。你建的是 codex 原生、非 1:1 镜像的树，可能触发它。先确认 sync-check 对新树的行为；**若它要求 `.claude` ↔ codex 严格同步、而你的方案不满足，停下来报告给用户**，不要擅自改 `.claude/scripts` 里的 lint 代码（用户没授权重建那套契约）。

## 执行顺序（不可颠倒）

- **阶段 A — 摸清现状 + 建 `.claude` 行为基线**：通读 8 个 `.claude/skills/<name>` 全部文件，弄清每个的触发条件、路由边界、编排工作流、硬规则、调用的 kata 脚本、会在哪些点弹 AskUserQuestion。然后用 `claude -p --model sonnet` 程序化真跑每个 skill（裸输入触发自动路由，**别加 `--bare`**），记录基线：输入形态 → 触发是否命中预期 skill → 编排过程（每个交互点 + 所用预设答案）→ 产物（文件路径、格式 / 字段、落盘位置）→ 影响范围。这份基线供阶段 C 对账。
- **阶段 B — 用 codex 原生机制重建 8 个 skill**：照搬 `.claude` 内容，用 codex 原生 skill 形态组织，symlink 复用脚本，交互点改造为 codex 原生机制。每个 skill 一个 commit。
- **阶段 C — codex E2E 真跑 + 与基线对账**：用 `codex exec`（模型 GPT-5.5）程序化真跑重建后的 8 个 skill，输入与阶段 A 完全一致，交互点用同一套「预设答案集」或 codex 原生参数喂入。与阶段 A 基线逐项对账：触发路由、产物文件 / 格式 / 落盘、影响范围是否一致。差异分类：codex 原生特性带来的合理差异 vs 适配缺陷；缺陷必须在本 worktree 内修复并复跑至一致。

## E2E 驱动机制（阶段 A / C 通用，务必先读）

- 模型固定：`.claude` 基线用 `claude -p --model sonnet`；codex 侧用 `codex exec` 指定 GPT-5.5。
- 两者都是非交互一次性模式：slash 形式 skill 仅交互可用，headless 下用「裸输入 / 描述任务」触发自动路由；勿加 `--bare`（否则不加载 skill / CLAUDE.md / hooks，路由不触发）。
- 这 8 个 skill 深度依赖问答式交互，而 headless 无真人答题位。先做一次行为探针：用一个会触发交互的 skill 试跑，确认交互能否被程序化回答；
  - 能 → 用多轮 / stream 把「预设答案集」喂回去；
  - 不能 → 退到「参数前置绕过」：把预设答案作为初始 prompt 里的上游参数 / 指令，触发各 skill 的显式 escape hatch（如 playwright-automation「已显式给 profile 就直接执行」、case-draft 显式给 project / module 跳过消歧），让 skill 不弹问也能按预设答案跑完。
- 探针结论与最终采用的驱动方式写进报告。

## 本次真实输入（开跑直接用）

- case-draft 的 Lanhu / Axure 裸输入：
  `https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=a58cd6d7-d125-4a54-a6a3-d46c132cecdf&docId=3d3ae6d5-092c-49db-a795-6a3f94f91593&docType=axure&pageId=d56489f6721345a6bf2732113beb4eca&image_id=3d3ae6d5-092c-49db-a795-6a3f94f91593&parentId=f37ceffc-4c19-4d3b-8d6a-3bbe49ae9dc8`
- case-hotfix 的 ZenTao 裸输入：`http://zenpms.dtstack.cn/zentao/bug-view-151624.html`
- playwright-automation 环境 profile：`local-ltqc.yaml`（开跑前确认它在 `workspace/<project>/_shared/env/` 下；若没有，核对真实文件名，也可能写作 `ltqc-local.yaml`）。

## 凭据 / 预设答案集（全真跑所需，开跑前备齐）

- 先查既有来源：`.env.local`、`.kata/infra/credentials.yaml`、`.kata/auth/`、现有 workspace feature 目录。缺什么一次性向用户批量索要，齐了再开跑；不得静默跳过或伪造。
- 至少覆盖：case-draft 的 `KATA_LANHU_COOKIE` / `KATA_LANHU_PASSWORD` + 目标 project + module 消歧 + 表单证据缺口处理选择；case-hotfix 的 `KATA_ZENTAO_PASSWORD`；playwright 的 env profile + `KATA_TARGET_ENV` + 可达目标应用 + 浏览器依赖；infra-diagnose 的可达 SSH 主机 + `credentials.yaml`；其余 skill 凡有交互点逐一给预设答案。凭据放 `.env.local` / `.kata`，不写入入口文档或提示词。

## 通用约束

- worktree-first：若主树有未提交改动先 `git add -A && git commit -m "chore: 🧹 save pre-worktree local changes"`，再 `git worktree add --detach .worktrees/<slug> main`，全程在内工作；按需 symlink 必要 ignored runtime 目录（`.kata` 等），`.kata/repos/**` 即使 symlink 也只读。
- 改后即测：每阶段改动后跑受影响测试，收尾跑 `bun test` 全量 + `bun run check:skills`（注意上面「CI 联动」警告）；任何失败排根因修复，不得 skip / 掩盖；确实超范围则停下说明交用户决定。
- commit 固定 type / emoji：feat 🧩 / refactor ✨ / fix 🩹 / chore 🧹 / docs 📝 / test 🧪；description 小写、≤ 72 字符。
- 验证诚实：报告写清 exact command / exit code / pass / fail / skip，以及未验证范围；别把局部通过说成全量。
- **绝不合 main、绝不 push。**

## 交付物（落 docs/）

1. `docs/skills/2026-06-01-codex-adaptation.md`：8 个 skill 的 codex 适配方案（用了哪些 codex 原生特性、symlink 清单、交互点改造方式）、阶段 A 的 `.claude` 行为基线、E2E 驱动探针结论。
2. `docs/skills/2026-06-01-codex-e2e-reconcile.md`：阶段 C 对账结果（逐 skill 一致项 / codex 原生合理差异 / 已修缺陷），验证命令与结果。
3. 最后输出 worktree 绝对路径 + HEAD SHA + 一句话总结，声明「未合并 main、未 push，等待用户检查后自行合入」。
