---
name: test-case
description: 用例编写、编辑、同步与标准化。需求源（Lanhu/Axure URL、PRD、截图、功能描述）走 create；既有 .yaml/.csv/.xlsx/.md/.xmind 或编辑诉求走 edit。只发目录路径转 ui-automation；ZenTao hotfix 回归转 defect-analyze。
---

# test-case

`prd/prd.md` 是确认后的唯一需求权威，`cases/test-points.md` 是从 PRD 派生并经用户确认的覆盖设计，`cases/需求名.yaml` 是用例唯一权威。`需求名.xmind` 等派生物只经 `kata cases build` 写入 `cases/exports/`。

| 输入 | 工作流 |
| --- | --- |
| 需求源或编写新用例 | [workflows/create.md](workflows/create.md) |
| 既有用例或编辑、同步、标准化 | [workflows/edit.md](workflows/edit.md) |

## 硬规则

- 新需求先完成 PRD 流程：蓝湖证据提取、知识注入、相关 release 源码准备、遗漏扫描、逐问确认、最终发布确认。最终确认前不得生成 `prd/prd.md`。
- 需求疑点一次只问一个；每题说明证据、影响、风险和推荐答案。知识库、蓝湖或源码能回答的事实不得再问用户。
- PRD 稳定 ID 使用 `FR/BR/ER/AC/PD-001`；测试点引用 PRD ID，用例 `source_ref` 引用测试点 ID。
- `cases/test-points.md` frontmatter 的 `prd_digest` 与 YAML `meta.test_points_digest` 必须形成摘要链；过期时 lint/build 阻断。
- 产物不得出现「待确认」「用户确认补充」或 MCP 工作提示。无法确认的需求不发布，无法纳入覆盖的测试点写明不覆盖原因。
- 菜单、字段、枚举和规则先查 `kata knowledge read`，不足再查已准备的源码。可跨需求复用且经确认的规则才写回知识库，随后运行 `kata knowledge index`。

## 产物

```text
<feature>/
├── prd/
│   ├── prd.md
│   ├── evidence/lanhu.json
│   ├── assets/
│   └── .process/session.json
└── cases/
    ├── test-points.md
    ├── 需求名.yaml
    ├── imports/
    └── exports/
```

feature 目录只能由 `kata features resolve --json` 定位。交付前运行 `kata prd lint`、`kata cases build`、`kata cases lint --exit-code`，并按 [checklists/review.md](checklists/review.md) 自审。
