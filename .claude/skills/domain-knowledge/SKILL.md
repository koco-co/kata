---
name: domain-knowledge
description: 查询、记录或维护项目业务知识、规则、术语，或回答「XX 是什么」（项目特定业务概念）。触发短语如「记一下这个规则」「XX 术语什么意思」「更新模块知识」。只问源码实现细节由 AI 直接回答；生成用例、UI 自动化、缺陷分诊转对应 skill。
---

# domain-knowledge

业务知识统一存 `workspace/<project>/knowledge/`，经 `kata knowledge` 命令读写，不直接手改文件；历史由 git 管理。

## 查询

```bash
kata knowledge read --project <项目> [--module <模块>] [--keyword <关键词>] [--json]
```

- 按模块注入用 `--module`（匹配标题或 tags）；按报错、术语检索用 `--keyword`。
- 只取命中条目，不加载整个库；无命中就说「知识库无匹配」，不臆造。

## 记录

```bash
kata knowledge write --project <项目> --type <module|pitfall|site> \
  --status <verified|observed|conflicting|deprecated> --title <标题> --body <md> \
  [--tags a,b] [--source <来源>]
```

四态按证据强度选：

- `verified`：用户确认、源码证据或复测验证过 → 直接写。
- `observed`：只观察到一次 → 命令回 pending 不写入；先向用户确认，确认后加 `--confirmed` 重跑。
- `conflicting`：与既有条目矛盾 → 写入并标注，同时向用户说明冲突点请其裁决。
- `deprecated`：已失效 → 标注保留不删，同名覆盖旧条目。

约束：

- 写入的事实必须有来源（源码、真实界面探测、用户明示），来源写进 `--source`；没有依据的内容不写。
- 密码、Cookie、Token、未脱敏日志等敏感信息须用户确认才写，否则脱敏后再写。
- 术语与概览是聚合文件：`--type term|overview` 用 `--content <json>`（结构见 `write --help`）。
- 业务知识（`knowledge/`）与编写约束（`rules/`）分开放，不混写；未明确项目前不跨项目写。
- 没有新知识就零写入；改完 `kata knowledge index --project <项目>` 重建索引。

## 闭环

- **任务开始**：test-case / ui-automation / infra-diagnose 等 skill 识别出模块或报错关键词后，先 `kata knowledge read --module/--keyword` 注入命中条目再动手，不重复排查。
- **任务结束**：执行中查证过的业务事实与踩坑按四态写回；同名条目覆盖更新。
