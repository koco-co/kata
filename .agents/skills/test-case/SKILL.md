---
name: test-case
description: QA 用例全生命周期。三种触发方式——① 给需求源（Lanhu/Axure URL、PRD md、设计稿截图、功能描述）起草新用例，只发 URL 即可；② 给既有用例文件（.yaml/.xmind/.csv/.md）或要求编辑、同步、标准化用例；③ 给 ZenTao bug ID、bug-view URL 或缺陷描述，生成单条 hotfix 回归用例。只发需求功能目录路径要做 UI 自动化时转 ui-automation。
---

# test-case

目标：把输入变成 `cases/需求名.yaml`——用例的唯一正式源。`需求名.xmind` 与 `exports/需求名.md` 由 `kata cases build --feature <featureDir>` 从 yaml 派生，绝不手改派生物。任何写进 yaml 的事实，动笔前必须已有答案（需求源 / 知识库 / 源码 / 用户确认）；产物不允许出现「待确认」，未确认内容不进产物。

## 三种入口

**create（需求源）**：Lanhu/Axure URL 用 `kata lanhu fetch` 取证；只发 URL 时不播报进度，但澄清提问必须照问。需求名 / 版本 / 模块 / 客户不知道就逐个问（一次一个、带推荐答案），再用 `kata features resolve --project <项目> --module <模块> --description <需求名> --feature-version <vX.Y.Z> --json` 定位 feature 目录（常驻需求改传 `--standing`）。先 `kata knowledge read --project <项目> --module <模块>` 注入事实基线，再把需求源与知识库都答不了的疑点逐个拷问（一次一个、带推荐答案；知识库、`kata repos grep/show` 能查到的不问），疑点清零后落盘 `<featureDir>/prd.md`（结构照 `.claude/skills/test-case/templates/prd.md`，每条事实标来源）。然后把 prd.md 拆成测试点清单给用户确认（正常 / 异常 / 边界、枚举逐项、P0 约 1/4~1/3），确认后落盘 `<featureDir>/test-points.md`（结构照 templates/test-points.md：确认过的进覆盖清单，确认不了的进未覆盖清单），最后才写 yaml：只写 prd.md 有依据、且在覆盖清单里的内容。

**edit（既有用例）**：只改 yaml，改完重新 build。语义不变是底线：字段、按钮、枚举值逐字匹配证据原文；缺证据的不凭空补、也不许标「待确认」——逐个向用户确认，确认不了的维持原样并在交付时列出。批量标准化按功能族逐条过，全部过完、lint 清零才算完；单条被阻塞就记录后继续其余，不因量大中途停下。

**hotfix（bug）**：`kata zentao fetch --bug-id <id> --output .temp-hotfix-<id>` 取证；缺修复范围或范围未定的，写 yaml 前逐个向用户确认。再用 `kata features resolve-hotfix --project <项目> --bug-id <id> --yyyymm <bug 解决或打开月份> --title <中文短标题>` 建目录（月份与短标题从 fetch JSON 取），把取证产物 `mv .temp-hotfix-<id> <hotfixDir>/.temp`。yaml 只含 1 条用例：标题以 `【<bug_id>】验证…` 开头；相邻回归点并进同一条；数据源 / schema 写 `${DataSourceA}` / `${SchemaA}`；出现具体表名时前置条件必含同名最简 `CREATE TABLE`；`meta.source` 写 bug URL。确认不了的内容不进 yaml——只交草稿与缺口说明。产出必须是可执行用例，不是缺陷分析。

## 约束

- 菜单、字段、规则语义以 `kata knowledge read --project <项目> --module <模块>` 返回的命中条目为准；存疑用 `kata repos grep/show` 查源码。没有依据的内容不写进用例。
- 识别出模块后先 `kata knowledge read --project <项目> --module <模块>` 注入命中条目；执行中遇报错按 `--keyword <关键词>` 补查。
- 结束时把查证过的事实与踩坑按四态写回（`kata knowledge write`，见 domain-knowledge skill）；单次观察先向用户确认再写入，没有新知识零写入。
- 不编造需求名、版本号、字段名；用户中途要求「别问了直接写」时，剩余疑点对应内容不进 yaml，交付时列出。

## 完成标准

- `prd.md` 与 `test-points.md` 已落盘且为本轮确认后的版本（hotfix 不要求）；yaml 覆盖范围与 test-points.md 覆盖清单一致。
- `kata cases build --feature <featureDir>` 通过并派生 xmind 与 exports/md。
- `kata cases lint --project <项目> --feature <id> --exit-code` 无 violation（含「待确认」字样硬闸）。
- 交付说明已验证与未验证范围；被阻塞时只交草稿并说清缺什么，不冒充完成。
