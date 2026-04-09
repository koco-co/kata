# Module Identify
## 读取时机
module-identify 阶段读取。在 source_snapshot 可用后、向用户询问项目前使用。
## 输入
- source_snapshot、page_hierarchy、页面标题、字段标签、路径关键字。
- workspace config.json、repo_profiles、项目知识库、已有 feature 目录。
## 输出
- project、feature_slug、feature_id、module_name、候选项目排序与证据。
- unresolved-- 前缀的兜底 feature_slug，并生成 `YYYY-MM-english-slug` 形态的 feature_id；同时列出需要用户消歧的最小问题。
## 禁止
- 不得在可通过配置、路径或知识库推断时先问用户。
- 不得把多个候选项目中未消歧的一个当成已确认项目。
- 不得跨 workspace 写入产物。
