---
name: test-case
description: QA 用例全生命周期。两种触发方式——① 给需求源（Lanhu/Axure URL、PRD md、设计稿截图、功能描述）起草新用例，只发 URL 即可；② 给既有用例文件（.yaml/.xmind/.csv/.md）或要求编辑、同步、标准化用例。只发需求功能目录路径要做 UI 自动化时转 ui-automation；ZenTao hotfix 回归转 defect-analyze。
---

# test-case

用例的唯一正式源是 `cases/需求名.yaml`；`prd.md`、`test-points.md` 是 create 的事实与范围契约，`需求名.xmind` 与 `exports/需求名.md` 是从 yaml 派生的产物，只经 `kata cases build` 重新生成，绝不手改。每条正式用例的 `automation.spec_file` 指向唯一自动化脚本。

## 按输入分流

| 输入 | 工作流 |
|---|---|
| 需求源（URL / PRD / 截图 / 功能描述） | [workflows/create.md](workflows/create.md) |
| 既有用例文件，或编辑 / 同步 / 标准化诉求 | [workflows/edit.md](workflows/edit.md) |

拿不准属于哪种时，先问用户一个问题确认意图，再动手。

## 事实纪律（三条工作流共用）

- 菜单名、按钮、表单字段、规则语义等产品事实，以 `kata knowledge read --project <项目> --module <模块>` 返回的命中条目为准；不足时按 `--keyword <关键词>` 补查，仍存疑用 `kata repos grep/show` 查源码枚举。没有依据的内容不得写进用例。
- 事实缺证据时逐个向用户确认（一次一个问题、每题带推荐答案），确认前不动笔；不得编造需求名、版本号、字段名或菜单路径。产物中不允许出现「待确认」：所有未确认点必须在写 yaml 前清零；用户也确认不了的内容不进产物，交付时列出缺口。
- 动手写之前先和用户对齐范围（起草对齐测试点清单，编辑对齐改动点），对齐后再写。

## 知识闭环（三条工作流共用）

- 识别出模块后先 `kata knowledge read --project <project> --module <模块>` 注入命中条目；执行中遇到报错再按 `--keyword <关键词>` 补查。
- 结束时把查证过的事实与踩坑按四态写回（`kata knowledge write`，见 domain-knowledge skill）；单次观察先向用户确认再写入，没有新知识就零写入。

## 完成标准（两条工作流共用）

- create：`prd.md`、`test-points.md`、canonical YAML、XMind、Markdown 派生物和 lint 都必须存在并通过。
- edit：按实际已有产物维护；语义变化必须同步 `prd.md` / `test-points.md`，再重建派生物与 lint。
- `kata cases lint --project <project> --feature <目录名或 metadata.id> --exit-code` 无 violation（含「待确认」字样硬闸）。
- 交付前按 [checklists/review.md](checklists/review.md) 自审，并在回复里说明已验证与未验证的范围。
- 被真实阻塞卡住时只交付草稿，回复里说清缺什么、需要谁补；不得拿草稿冒充完成。

## 产物位置

feature 目录由 `kata features resolve --json` 返回，产物写它的 `cases/` 子目录，不要自己拼路径。Hotfix 回归报告由 `defect-analyze` 写入 `workspace/<project>/analyses/hotfix-case/<yyyymm>/<slug>.md`，本 Skill 不创建 hotfix 用例。

## 需要子代理时

用例材料量大、要起草的测试点很多时，可派子代理按 [prompts/worker.md](prompts/worker.md) 写 yaml；主会话负责取证、逐个拷问、对齐范围与交付前自审。worker 回传的存疑清单由主会话逐个向用户确认：确认后补写，确认不了的测试点剔除并在交付说明列出。
