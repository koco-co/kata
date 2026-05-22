# case-hotfix

## 功能说明

依据已知 bug、issue 记录或修复说明，产出聚焦于修复路径的 hotfix 回归用例。核心产出是单条可直接执行的回归测试用例，而非完整的测试套件。

**路由注意**: 仅输入 ZenTao bug URL / bug-view URL / bug ID 时，自动转发到此 skill。

## 输入

- **report** (required): bug 来源，可以是：
  - ZenTao bug URL / bug-view URL / bug ID（自动抓取）
  - 缺陷描述文本
  - 修复说明
  - issue 记录
- **project** (optional): workspace ID。

**示例**:
```
https://zentao.xx.com/bug-view-1234.html
"bug #1234 已修复，需要回归用例"
"根据这个修复 commit 生成回归用例"
```

## 输出

- **archive**: 独立目录下的 hotfix archive.md 文件。包含一条回归用例、前置条件、步骤表。
- **notes**: 如果 bug 记录未修复或缺少修复范围，生成 pending_items 待办项。

## 执行流程

1. **输入解析**：从 bug URL/ID/描述中获取缺陷信息。
2. **抓取证据**：从 ZenTao 或其他来源抓取 bug 记录详情。
3. **分析修复范围**：确定修复路径和相邻回归风险点。
4. **draft_cases**: 撰写单条 hotfix 回归用例。
5. **review_cases**: 审查用例的完整性和可执行性。
6. **output**: 输出 archive.md、source_refs.json 和 .temp 证据。

## 产物要求

### 目录结构

```
workspace/{project}/features/hotfix_{fix_branch_or_bug_id}-{short-title}/
  ├── archive.md           # 回归用例（人类可读）
  ├── source_refs.json     # 证据引用（结构化）
  └── .temp/               # 原始抓取证据
```

### archive.md 格式

- 必须包含 frontmatter，其中 `zentao_url` 是必需字段。
- keywords 第 5 段：最低修复大版本（不得写构建号、客户缩写或修复分支名）。
- keywords 第 6 段：具体问题原因（不得写"代码缺陷"等泛化原因）。
- 模块层级 + 前置条件 + 用例步骤表结构。

### 用例数量

- 必须只包含 **1** 条用例。
- 相邻回归风险点只能合并为同一条用例内的必要步骤或预期检查。

### 前置条件

- 使用单个无语言标记的代码块（不得使用 ```sql）。
- 优先给出可复制执行的 SQL。
- 涉及特定数据状态时必须同时包含建表语句和插入语句。
- SQL 不得写固定库名/schema 前缀。

### SourceRef 约束

- SourceRefs 只写入 hotfix 目录内的 `source_refs.json`。
- 不得使用散落在 issues 目录下的 `.source_refs.json`。
- archive.md 不得包含 SourceRef、bug.record@N 等引用标识。
- 原始抓取证据必须写入 `./temp`，不得写入其他位置。

### Spark SQL 注意事项

- 不得生成所有字段均为分区字段的 CREATE TABLE。
- 主缺陷复现表必须保持证据要求的特殊数据形态。

## 参考

- `.ai/core/skills/case-hotfix/skill.yaml`
- `.ai/core/skills/case-hotfix/references/hotfix-archive-format.md`
