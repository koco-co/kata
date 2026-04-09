# Historical Context
## 读取时机
historical-context 阶段读取。项目和模块候选已确定后，用于补足历史规则、旧用例和相邻实现线索。
## 输入
- workspace/{project}/knowledge/** 与 workspace/{project}/features/**。
- .kata/repos/{project}/** 仅可作为只读证据，且读取前必须取得用户 consent。
- 若无 consent，输出 skipped HistoricalContextPack，并记录 scoping notes。
## 输出
- HistoricalContextPack，包含可引用历史事实、相似用例、术语解释、源码线索和跳过原因。
- 每条历史线索标注 source_ref、scope、freshness、confidence。
- 明确标注 historical_context.cannot_confirm_new_behavior。
## 禁止
- 不得写入、提交、推送或修改 .kata/repos/{project}/**。
- 不得把历史实现或旧用例当成新增行为的产品确认。
- 不得在无 consent 时读取 .kata/repos/**；只能输出 skipped/scoping notes。
