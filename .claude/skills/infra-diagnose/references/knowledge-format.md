# 排查知识库：先查后做，收尾记录

排查知识记录在本地 `.kata/infra/knowledge/`（`.kata/` 已被 `.gitignore` 忽略，可以含真实 IP 和命令）。每个问题一个 Markdown 条目，文件名用 `YYYYMMDD-<关键词>.md`（如 `20260521-hive-no-route-to-host.md`）。

## 排查前：检索

动手前先检索 `.kata/infra/knowledge/`：

1. 分别用报错关键词（如 `No route to host`、`Connection refused`、`hiveserver2`）、主机 IP、端口去匹配已有条目。
2. **命中**：优先复用条目里的「排查步骤」和「解决方案」，对照当前现场快速验证是不是同一个原因。命中后能大幅缩短排查时间。
3. **未命中**：按 `diagnostic-playbook.md` 自行排查；排查完后必须新增一条条目（见下）。

目录不存在时，先创建 `.kata/infra/knowledge/`。

## 排查后：记录

定位到根因或修复完成后，写入或更新条目，字段要齐全：

```markdown
# <一句话症状摘要>

- 日期：YYYY-MM-DD
- 主机：<host>(:<port>)
- 服务/数据源：<如 HiveServer2 / MySQL>
- 报错原文：
  ```
  <粘贴关键报错，如 java.net.NoRouteToHostException: No route to host>
  ```

## 根因
<确认的根因，区分事实与推断>

## 排查过程
<按顺序列出执行的关键命令及其输出摘要（作为证据）>

## 解决方案
<最终修复动作；破坏性操作标注「已确认执行」>

## 复测
<修复后重新诊断的命令与结果，证明问题已解决>
```

## 原则

- 条目要写得**可复用**：下次遇到同类报错，照着条目就能定位。
- 只写有证据支撑的根因；推断和未验证的假设单独标注，不要写成结论。
- 同类问题已有条目时，更新它，不要再新建重复条目。
