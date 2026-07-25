---
name: case
description: QA 用例全生命周期。三种触发方式——① 给需求源（Lanhu/Axure URL、PRD md、设计稿截图、功能描述）起草新用例，只发 URL 即可；② 给既有用例文件（.yaml/.xmind/.csv/.md）或要求编辑、同步、标准化用例；③ 给 ZenTao bug ID、bug-view URL 或缺陷描述，生成单条 hotfix 回归用例。只发需求功能目录路径要做 UI 自动化时转 ui-automation。
---

# case

用例的唯一正式源是 `cases/需求名.yaml`；`需求名.xmind` 与 `exports/需求名.md` 是从它派生的产物，只经 `kata cases build` 重新生成，绝不手改。

## 按输入分流

| 输入 | 工作流 |
|---|---|
| 需求源（URL / PRD / 截图 / 功能描述） | [workflows/draft.md](workflows/draft.md) |
| 既有用例文件，或编辑 / 同步 / 标准化诉求 | [workflows/edit.md](workflows/edit.md) |
| bug ID / bug-view URL / 缺陷描述 | [workflows/hotfix.md](workflows/hotfix.md) |

拿不准属于哪种时，先问用户一个问题确认意图，再动手。

## 事实纪律（三条工作流共用）

- 菜单名、按钮、表单字段、规则语义等产品事实，以 `workspace/<project>/knowledge/` 为准：界面文案查 `sites/<host>/dom-*.md`，规则语义查 `modules/<module>.md`；仍存疑用 `kata repos grep/show` 查源码枚举。没有依据的内容不得写进用例。
- 事实缺证据时逐个向用户确认（一次一个问题、每题带推荐答案），确认前不动笔；不得编造需求名、版本号、字段名或菜单路径。产物中不允许出现「待确认」：所有未确认点必须在写 yaml 前清零；用户也确认不了的内容不进产物，交付时列出缺口。
- 动手写之前先和用户对齐范围（起草对齐测试点清单，编辑对齐改动点），对齐后再写。

## 知识闭环（三条工作流共用）

- 识别出模块后先 `kata knowledge read --project <project> --module <模块>` 注入命中条目；执行中遇到报错再按 `--keyword <关键词>` 补查。
- 结束时把查证过的事实与踩坑按四态写回（`kata knowledge write`，见 knowledge skill）；单次观察先向用户确认再写入，没有新知识就零写入。

## 完成标准（三条工作流共用）

- `cases/需求名.yaml` 通过 `kata cases build --feature <featureDir>` 校验，并成功派生 `需求名.xmind` 与 `exports/需求名.md`。
- `kata cases lint --project <project> --feature <id> --exit-code` 无 violation（含「待确认」字样硬闸）。
- 交付前按 [checklists/review.md](checklists/review.md) 自审，并在回复里说明已验证与未验证的范围。
- 被真实阻塞卡住时只交付草稿，回复里说清缺什么、需要谁补；不得拿草稿冒充完成。

## 产物位置

feature 目录由 `kata features resolve --json` 返回，产物写它的 `cases/` 子目录，不要自己拼路径。hotfix 目录例外，见 [workflows/hotfix.md](workflows/hotfix.md)。

## 需要子代理时

用例材料量大、要起草的测试点很多时，可派子代理按 [prompts/worker.md](prompts/worker.md) 写 yaml；主会话负责取证、逐个拷问、对齐范围与交付前自审。worker 回传的存疑清单由主会话逐个向用户确认：确认后补写，确认不了的测试点剔除并在交付说明列出。
