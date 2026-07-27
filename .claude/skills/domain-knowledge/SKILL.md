---
name: domain-knowledge
description: 查询、记录或维护项目业务知识、规则与术语，或回答「XX 是什么」这类项目特定业务概念。典型触发短语：「记一下这个规则」「XX 术语什么意思」「更新模块知识」。只问源码实现细节的问题由 AI 直接回答；要生成用例、UI 自动化或做缺陷分诊时转对应 skill。
---

# domain-knowledge

业务知识统一存放在 `workspace/<project>/knowledge/`，一律通过 `kata knowledge` 命令读写，不要直接手动编辑文件；变更历史由 git 管理。

## 查询

```bash
kata knowledge read --project <项目> [--module <模块>] [--keyword <关键词>] [--type <类型>] [--status <状态|all>] [--json]
```

- 要按模块注入条目时用 `--module`（匹配标题或 tags）；要按报错信息或术语检索时用 `--keyword`。
- 默认只注入 `verified` 条目；`observed` 条目只能作为线索参考，不能升级成 `verified`；`conflicting` 条目必须保留双方证据，先裁决再使用；`deprecated` 条目默认不注入，仅在显式使用 `--status all` 或指定状态复核历史时才读取。
- 只取命中的条目，不加载整个知识库；没有命中时直接回复「知识库无匹配」，不要臆造内容。

## 记录

```bash
kata knowledge write --project <项目> --type <term|module|pitfall|site> \
  --status <verified|observed|conflicting|deprecated> --title <标题> --body <md> \
  --source <来源> [--tags a,b]
```

四种状态按证据强度选择：

- `verified`：经用户确认、有源码证据或复测验证过 → 直接写入。
- `observed`：只观察到一次 → 可以自动记录，但必须写明来源，绝不自动升级为 `verified`。
- `conflicting`：与既有条目矛盾 → 同名条目语义有变化时默认返回 pending，不覆盖原文；带上 `--confirmed` 后才合并，并保留冲突说明。
- `deprecated`：已失效 → 只做标注并保留，不删除；同名条目语义变化时同样走 pending 机制，带 `--confirmed` 后才合并。

约束：

- 写入的内容必须有来源（源码、真实界面探测、用户明示），并把来源写进 `--source`；没有依据的内容不要写入。
- 密码、Cookie、Token、session 路径、私密 YAML 正文和未脱敏日志一律不得写入；需要引用凭据时，只记录凭据名称或脱敏后的结论。
- 术语条目存为单条文件 `knowledge/terms/<slug>.md`；`overview.md` 仍作为项目级上下文，用 `--content <json>` 写入。
- 业务知识（`knowledge/`）与编写约束（`rules/`）分开存放，不要混写；未明确所属项目前，不要跨项目写入。
- 没有新知识就不写入；改完后运行 `kata knowledge index --project <项目>` 重建索引。

## 闭环

- **任务开始**：test-case / ui-automation 等 skill 识别出模块或报错关键词后，先用 `kata knowledge read --module/--keyword` 注入命中条目再动手，避免重复排查。
- **任务结束**：把执行中查证过的规则与踩坑按四种状态写回；同名且不冲突的内容自动合并，语义有变化时先确认再合并。
