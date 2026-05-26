# QA 产物质量检查

## 自检要求

创建或编辑 Archive Markdown、XMind、CSV 衍生用例或标准化 QA 产物后，交付前必须自检，不得依赖用户发现格式或业务规则缺陷。

## 一致性自检维度

Archive Markdown 与 XMind 必须从同一用例模型生成/更新，逐字段比对以下六维必须一致：

- 版本/模块
- 需求
- 标题
- 优先级/marker
- 前置条件
- 步骤
- 预期结果

用户明确指定用例标题或历史标题包含业务括号（如「验证【规则名】...」）时，必须原样保留业务括号内容，不得按通用标题规则移除。

用例级节点的所有格式细节（标题三段式、前置条件 SQL 注释块、`${SchemaA}` 占位符、步骤=单页面、预期编号写法、XMind topic 镜像与 priority marker 对照、数据质量「规则集 → 规则任务」前置链、分区切换正负样本约束等）一律以 `.ai/core/skills/case-draft/references/output-standard.md#用例级节点格式（Case-Level Normative）` 为准。

## 产物变更后检查

QA 产物编辑后执行以下专项检查：
- 用例数量和优先级分布
- Markdown/XMind 一致性
- XMind 标记分布
- 过期术语/菜单名称残留
- 涉及模块相关的领域规则扫描
