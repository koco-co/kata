---
name: domain-knowledge
description: 查询、记录或维护项目业务知识、规则、术语，或回答「XX 是什么」（项目特定业务概念）。触发短语如「记一下这个规则」「XX 术语什么意思」「更新模块知识」。只问源码实现细节由 AI 直接回答；生成用例、UI 自动化、缺陷分诊转对应 skill。
---

# domain-knowledge

业务知识统一存 `workspace/<project>/knowledge/`，经 `kata knowledge` 命令读写，不直接手改文件；历史由 git 管理。

## 查询

```bash
kata knowledge read --project <项目> [--module <模块>] [--keyword <关键词>] [--type <类型>] [--status <状态>] [--json]
```

- 按模块注入用 `--module`（匹配标题或 tags）；按报错、术语检索用 `--keyword`。
- `verified` 可作为已确认事实使用；`observed` 只能作为线索，不能升级成 `verified`；`conflicting` 必须保留双方证据并先裁决；`deprecated` 默认不作为当前规则注入，只有明确复核历史时读取。
- 只取命中条目，不加载整个库；无命中就说「知识库无匹配」，不臆造。

## 记录

```bash
kata knowledge write --project <项目> --type <term|module|pitfall|site> \
  --status <verified|observed|conflicting|deprecated> --title <标题> --body <md> \
  --source <来源> [--tags a,b]
```

四态按证据强度选：

- `verified`：用户确认、源码证据或复测验证过 → 直接写。
- `observed`：只观察到一次 → 可以自动记录，但必须保留来源，绝不自动升级为 `verified`。
- `conflicting`：与既有条目矛盾 → 同名语义变化默认返回 pending，不覆盖原文；带 `--confirmed` 后才合并并保留冲突说明。
- `deprecated`：已失效 → 标注保留不删，同名覆盖旧条目。

约束：

- 写入的事实必须有来源（源码、真实界面探测、用户明示），来源写进 `--source`；没有依据的内容不写。
- 密码、Cookie、Token、session 路径、私密 YAML 正文和未脱敏日志一律不得写入；只记录命名凭据或脱敏结论。
- 术语是 `knowledge/terms/<slug>.md` 单条文件；`overview.md` 仍是项目级上下文，使用 `--content <json>`。
- 业务知识（`knowledge/`）与编写约束（`rules/`）分开放，不混写；未明确项目前不跨项目写。
- 没有新知识就零写入；改完 `kata knowledge index --project <项目>` 重建索引。

## 闭环

- **任务开始**：test-case / ui-automation / infra-diagnose 等 skill 识别出模块或报错关键词后，先 `kata knowledge read --module/--keyword` 注入命中条目再动手，不重复排查。
- **任务结束**：执行中查证过的业务事实与踩坑按四态写回；同名非冲突内容自动合并，语义变化先确认。
