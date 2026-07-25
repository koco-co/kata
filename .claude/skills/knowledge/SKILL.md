---
name: knowledge
description: 查询、记录或维护项目业务知识、规则、术语，或回答「XX 是什么」（项目特定业务概念）。触发短语如「记一下这个规则」「XX 术语什么意思」「更新模块知识」。只问源码实现细节由 AI 直接回答；生成用例、UI 自动化、缺陷分诊转对应 skill。
---

# knowledge

业务知识统一存 `workspace/<project>/_shared/knowledge/`，经 `kata knowledge` 命令读写，不直接手改文件。

## 查询

```bash
kata knowledge read-core --project <项目>                      # 概览 + 术语 + 索引
kata knowledge read-module --project <项目> --module <模块>     # 单个模块
kata knowledge read-pitfall --project <项目> --query <关键词>   # 搜踩坑
```

无可靠命中就直接说「知识库无已确认匹配」，不臆造。

## 记录

```bash
kata knowledge write --project <项目> --type <term|overview|module|pitfall> \
  --content <json> --confidence <high|medium|low>
```

- 写入的事实必须有来源（源码、真实界面探测、用户明示）；`--confidence` 反映证据强度，低于 high 先和用户确认，确认后加 `--confirmed`。`--content` 的 JSON 结构以 `write --help` 为准。
- 业务知识（`knowledge/`）与编写约束（`rules/`）分开放，不混写。
- 未明确项目前不跨项目写，避免把一个项目的事实写进另一个项目的库。
- 改完后 `kata knowledge index --project <项目>` 重建索引。

## 闭环

其它 skill（case / ui-automation / infra-diagnose）执行中查证过的业务事实与踩坑，结束时经本 skill 写回；后续任务先查知识库再动手，不重复排查。
