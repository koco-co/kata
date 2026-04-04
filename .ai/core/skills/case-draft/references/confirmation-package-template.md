# Confirmation Package Template
## 读取时机
confirmation-package 与 product-feedback-merge 阶段读取。仍有待确认项、默认建议或阻塞风险时使用。
## 输入
- AmbiguityScanReport。
- affected_atoms、impact_if_unanswered、建议默认值和证据来源。
- 产品反馈原文。
## 输出
- confirmation-package.md。
- 每个问题包含 question_id、affected_atoms、recommended_default、impact_if_unanswered、answer_slot。
- 产品反馈合并后的 accepted_recommendations 与仍未解决项。
## 禁止
- 不得提出没有 affected_atoms 的问题。
- 不得把历史推断包装成产品已确认答案。
- 不得在仍有 blocking_unknown 时承诺最终 archive.md 或 cases.xmind。
