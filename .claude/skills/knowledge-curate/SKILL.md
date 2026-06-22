---
name: knowledge-curate
description: 查询、记录或维护项目业务知识、规则、术语、模块事实，或问「XX 是什么」(项目业务概念)，统一记录于 _shared/knowledge/。触发短语如「记一下这个规则」「XX 术语什么意思」「更新模块知识」。只问源码实现细节，或需要编写用例、扫描 diff、做 UI 自动化，请转至对应 case-*/defect-analyze/playwright-automation。
argument-hint: '<业务术语 | 规则描述 | "XX 是什么">'
user-invocable: true
model: sonnet
effort: medium
---

# knowledge-curate

查询与维护项目业务知识，分两种模式：**查询**时检索知识库并引用证据 ID，**记录**时把业务事实、规则、术语按分类落盘到 `workspace/{project}/_shared/knowledge/`。

## 路由边界

以下场景不属本 skill 范围，请转至对应 skill：

- 纯源码实现细节问答（非业务知识）→ 由 AI 直接回答
- 生成或编辑用例 → case-*

## 工作流

查询走 read 命令，命中后引用其 SourceRef ID；无可靠命中时直接说明「知识库无已确认匹配」，不得臆造：

```bash
kata knowledge-curate read-core    --project <name>                      # 概览 + 术语 + 索引
kata knowledge-curate read-module  --project <name> --module <name>      # 单个模块
kata knowledge-curate read-pitfall --project <name> --query <keyword>    # 按关键词搜踩坑
```

写入走 write 命令，`--type` 选 term/overview/module/pitfall；`--confidence` 低于 high 时须先和用户确认，确认后加 `--confirmed`（`--content` 的 JSON 结构以 `write --help` 为准）：

```bash
kata knowledge-curate write --project <name> --type <type> --content <json> --confidence <high|medium|low> [--confirmed]
```

## 存储规范

- 业务知识存放于 `workspace/{project}/_shared/knowledge/**`，项目规则存放于 `workspace/{project}/_shared/rules/**`。两者分仓存放、不得混写，免得事实与编写约束互相污染；仅在用户明确要求时，才把实现上下文记为业务知识。
- 未明确选定项目前，不得跨项目编辑知识，避免把一个项目的事实写进另一个项目的库。
- 写入知识库的事实、根因都必须有来源支撑；无证据支撑的内容不得记入（查询时的引用规则见上方工作流）。
