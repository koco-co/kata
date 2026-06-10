# 规则优先级

```
用户当前指令 (memory)
  > feature rules
  > project rules
  > 全局 rules
  > skill 私有 rules
```

knowledge 不进入硬约束的优先级排序；但所有 skill 和 engine 都必须先读 knowledge，再做决策。
