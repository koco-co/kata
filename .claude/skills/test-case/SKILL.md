---
name: test-case
description: 用例编写、编辑、同步与标准化。两种触发方式——① 给需求源（Lanhu/Axure URL、PRD md、设计稿截图、功能描述）编写新用例，只发 URL 即可触发；② 给既有用例文件（.yaml/.csv/.xlsx/.md/.xmind），或要求编辑、同步、标准化。只发目录路径一律转 ui-automation；ZenTao hotfix 回归转 defect-analyze。
---

# test-case

用例以 `cases/需求名.yaml` 为唯一权威来源；CSV/XLSX/Markdown/XMind 输入先转成 YAML，所有输出再从 YAML 生成。`requirement-notes.md` 记录确认过的需求内容，`test-points.md` 记录对齐过的覆盖范围，两者落在 feature 根，是 create 的依据；派生物统一写入 `cases/exports/`，默认只生成 `需求名.xmind`，只有 YAML `meta.exports` 显式声明时才额外生成 CSV/XLSX/Markdown。派生物只经 `kata cases build` 重建，禁止手工修改。自动化映射分 `unmapped`、`mapped-not-implemented`、`implemented` 三种状态；只有已实现的用例才要求 `automation.spec_file` 指向可加载的真实脚本。

## 分流

| 输入 | 工作流 |
|---|---|
| 需求源（URL / PRD / 截图 / 功能描述） | [workflows/create.md](workflows/create.md) |
| 既有用例文件，或编辑 / 同步 / 标准化诉求 | [workflows/edit.md](workflows/edit.md) |

拿不准属于哪种时，先问用户一个问题确认意图，再动手。

## 纪律（两条工作流共用）

- 菜单名、按钮、表单字段、规则语义等，以 `kata knowledge read --project <项目> --module <模块>` 的命中条目为准；条目不足时按 `--keyword <关键词>` 补查，仍有疑问再用 `kata repos grep/show` 查源码枚举。没有依据的内容不得写进用例。
- 疑点逐个向用户确认（一次一个问题、每题带推荐答案），全部确认前不动笔；禁止编造需求名、版本号、字段名或菜单路径。产物中禁止出现「待确认」字样：未确认点必须在写 yaml 前清零；用户也确认不了的内容不进产物，交付时列出缺口。
- 动笔前先和用户对齐范围：编写新用例时对齐测试点清单，编辑既有用例时对齐改动点。

## 知识闭环

- 识别出模块后，先用 `kata knowledge read --project <project> --module <模块>` 读取命中条目；执行中遇到报错再按 `--keyword <关键词>` 补查。
- 结束时把查证过的规则与踩坑按四种状态写回（`kata knowledge write`，见 domain-knowledge skill）；单次观察所得先向用户确认再写入，没有新知识就不写入。

## 完成标准

- create：`requirement-notes.md`、`test-points.md`、`cases/需求名.yaml` 与 YAML 声明的派生物都存在（默认只有 XMind），lint 通过。
- edit：按实际已有的产物维护；语义变化必须先同步 `requirement-notes.md` / `test-points.md`，再重建派生物并通过 lint。
- `kata cases lint --project <project> --feature <目录名或 metadata.id> --exit-code` 无 violation（yaml 含「待确认」字样会触发硬闸）。
- 交付前按 [checklists/review.md](checklists/review.md) 自审，并在回复里说明已验证与未验证的范围。
- 被真实阻塞卡住时只交付草稿，回复里说清缺什么、需要谁补；不得拿草稿冒充完成。

## 产物位置

feature 目录由 `kata features resolve --json` 返回（取 `featureDir`），禁止自己拼路径。用例 YAML 写入 `<featureDir>/cases/需求名.yaml`；历史输入原样归档到 `<featureDir>/cases/imports/`；`requirement-notes.md` 与 `test-points.md` 落在 `<featureDir>/` 根；派生物由 build 统一写入 `<featureDir>/cases/exports/`。

## 需要子代理时

用例材料量大、待编写的测试点很多时，可以派子代理按 [prompts/worker.md](prompts/worker.md) 写 yaml；主会话负责取证、逐个确认疑点、对齐范围与交付前自审。worker 回传的存疑清单由主会话逐条向用户确认：确认后补写进 yaml，确认不了的测试点剔除，并在交付说明中列出。

## 边界

- Hotfix 回归报告由 defect-analyze 写入 `workspace/<project>/analyses/hotfix-case/<yyyymm>/<slug>.md`，本 Skill 不创建 hotfix 用例。
