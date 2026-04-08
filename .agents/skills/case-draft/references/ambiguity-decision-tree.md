# Ambiguity Decision Tree
## 读取时机
ambiguity-scan 与 product-feedback-merge 阶段读取。用于分类不确定项，并在产品反馈后只重扫受影响 atoms。
## 输入
- RequirementAtomList。
- 十维检查维度：数据来源、历史数据影响、测试范围、PRD 合理性、字段定义、交互逻辑、导航路径、状态流转、权限控制、异常处理。
- 产品明确回复、接受的默认建议、被拒绝或未回答的问题。
## 输出
- AmbiguityScanReport。
- 每个 atom 的 ambiguity_class、confidence、impact_if_unanswered、default_basis。
- blocking_unknown、defaultable_unknown、history_inferred、confirmed 的分类结果。
## 禁止
- 不得把未回答的 blocking_unknown 转成测试步骤。
- 不得把产品沉默视为显式接受。
- 不得在反馈合并时重写未受影响 atoms 的确认状态。
