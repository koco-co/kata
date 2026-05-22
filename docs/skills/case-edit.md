# case-edit

## 功能说明

对已有 QA 用例产物进行编辑、同步（Archive MD <-> XMind 双向同步）、标准化（字段格式统一、术语归一化）和格式间转换（Archive/XMind/CSV 互转）。核心原则是"语义不变"——不允许凭空补造缺失内容。

## 输入

- **artifact** (required): 已有的用例产物文件路径。支持以下格式：
  - XMind 文件（`*.xmind`）
  - CSV 文件（`*.csv`）
  - Archive Markdown 文件（`archive.md`）
  - 综合产物目录
- **project** (optional): workspace ID。

**示例**:
```
"编辑这个 archive.md 的优先级"
"同步 features/<slug>/ 下的 archive.md 和 cases.xmind"
"把 CSV 用例转换为 XMind 格式"
```

## 输出

- **archive**: 编辑后的 Archive Markdown 文件。
- **xmind**: 编辑后的 XMind 文件。
- **normalized**: 标准化后的产物（字段格式统一）。
- **apply_corrections**: 应用修正的结果（读取 case-corrections.md + sidecar）。

## 执行流程

1. **plan_edit**: 了解用户希望做什么修改，评估影响范围。
2. **preview_diff**: 预览修改前后的差异。
3. **apply_edit**: 执行编辑操作（语义不变）。
4. **output**: 输出编辑后的产物。

### 特殊流程: apply_corrections

当存在 `case-corrections.md` + 对应的 sidecar 修正文件时：
1. 读取修正文件内容。
2. 执行 dry-run summary，提供三选一（全部应用/部分应用/拒绝）。
3. 按 `status=approved` 回写 archive.md。
4. 调用 archive-xmind-sync 同步 XMind。
5. 写入 apply-log 记录。

## 产物要求

### 语义完整性

- 编辑或同步时，原有语义须完整保留（新增/修改内容必须有来源依据）。
- 缺失的前置条件、步骤或预期结果不得凭空补造。

### 自检要求

交付前必须自审：
- Archive 与 XMind 的用例数量一致性。
- 优先级分布合理性。
- 标题、前置条件、步骤、预期结果逐字段比对。

### XMind 可读性

- 连续动作、配置项或展示项必须用真实换行拆开。
- 单个节点行不得塞入多个动作子句或三个及以上引号项。
- 超长 SQL、前置条件、步骤或预期不得塞进单个 topic title 或 note。
- 必须拆成可展开分块节点。

### 业务规则一致性

涉及数据质量"规则任务管理"的用例：
- 必须先在"规则集管理"创建/配置规则集、规则包或监控规则。
- 再在"规则任务管理"引用或导入规则包。

## 参考

- `.ai/core/skills/case-edit/skill.yaml`
- `.ai/core/skills/case-edit/references/archive-xmind-sync.md`
- `.ai/core/skills/case-edit/references/apply-corrections.md`
- `.ai/core/rules/case-qa.md`
