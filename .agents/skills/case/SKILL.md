---
name: case
description: QA 用例全生命周期。三种触发方式——① 给需求源（Lanhu/Axure URL、PRD md、设计稿截图、功能描述）起草新用例，只发 URL 即可；② 给既有用例文件（.yaml/.xmind/.csv/.md）或要求编辑、同步、标准化用例；③ 给 ZenTao bug ID、bug-view URL 或缺陷描述，生成单条 hotfix 回归用例。只发需求功能目录路径要做 UI 自动化时转 ui-automation。
---

# case

目标：把输入变成 `cases/需求名.yaml`——用例的唯一正式源。`需求名.xmind` 与 `exports/需求名.md` 由 `kata cases build --feature <featureDir>` 从 yaml 派生，绝不手改派生物。

## 三种入口

**起草（需求源）**：Lanhu/Axure URL 用 `bun .claude/plugins/lanhu/fetch.ts` 取证。用 `kata features resolve --project <项目> --module <模块> --description <需求名> --feature-version <vX.Y.Z> --json` 定位 feature 目录（漏传版本会落 `features/_standing/`；版本不知道就先问）。先把测试点清单（正常/异常/边界、枚举逐项、P0 约 1/4~1/3）给用户确认，再写 yaml。

**编辑（既有用例）**：只改 yaml，改完重新 build。语义不变是底线：字段、按钮、枚举值逐字匹配证据原文；缺证据的标「待确认」，不凭空补；修错后直接陈述行为，不在正文解释改动原因。批量标准化按功能族逐条过，全部过完、lint 清零才算完；单条被阻塞就记录后继续其余，不因量大中途停下。

**hotfix（bug）**：`bun .claude/plugins/zentao/fetch.ts --bug-id <id> --output <hotfixDir>/.temp` 取证。目录用 `workspace/<project>/features/_hotfix/<yyyymm>-<bug_id>-<中文短标题>/`。yaml 只含 1 条用例：标题以 `【<bug_id>】验证…` 开头；相邻回归点并进同一条；数据源/schema 写 `${DataSourceA}`/`${SchemaA}`；出现具体表名时前置条件必含同名最简 `CREATE TABLE`；`meta.source` 写 bug URL。产出必须是可执行用例，不是缺陷分析。

## 约束

- 菜单、字段、规则语义以 `workspace/<project>/knowledge/`（`sites/<host>/dom-*.md`、`modules/<module>.md`）为准；存疑用 `kata repos grep/show` 查源码。没有依据的内容不写进用例。
- 识别出模块后先 `kata knowledge read --project <项目> --module <模块>` 注入命中条目；执行中遇报错按 `--keyword <关键词>` 补查。
- 结束时把查证过的事实与踩坑按四态写回（`kata knowledge write`，见 knowledge skill）；单次观察先向用户确认再写入，没有新知识零写入。
- 事实缺证据时停下来说清缺口，不编造需求名、版本号、字段名。

## 完成标准

- `kata cases build --feature <featureDir>` 通过并派生 xmind 与 exports/md。
- `kata cases lint --project <项目> --feature <id> --exit-code` 无 violation。
- 交付说明已验证与未验证范围；被阻塞时只交草稿并说清缺什么，不冒充完成。
