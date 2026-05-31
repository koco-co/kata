# 规则优先级

```
用户当前指令 (memory)
  > feature rules
  > project rules
  > 全局 rules
  > skill 私有 rules
```

knowledge 不参与硬约束优先级（事实 ≠ 约束），但所有 skill / engine 必须先读 knowledge 再做决策。
