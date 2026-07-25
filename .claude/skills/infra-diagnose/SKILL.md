---
name: infra-diagnose
description: 数据源/数据库/服务器连通性报错（JDBC No route to host、连接超时、连接被拒等）时，SSH 登录目标机只读排查、定位根因并修复，把可复用结论写回知识库。纯前端运行时报错、无需 SSH 的转 defect-analyze。
---

# infra-diagnose

顺序：先查知识库，再只读诊断定位根因，破坏性修复先确认，最后写回知识库。

## 流程

1. **查知识库**：`kata knowledge read-pitfall --project <项目> --query <报错关键词或主机>`。命中既有条目优先复用其方案，省去重复排查。
2. **只读诊断**：没命中按 [references/playbook.md](references/playbook.md) 分步排查（本地连通性分层 → SSH 登录只读检查）。SSH 凭据与执行规约也在 playbook 里。
3. **修复**：只读命令可直接执行；破坏性命令（重启服务、改防火墙、改配置、kill、rm）必须先说明在哪台机执行什么、预期影响，用户确认后再做，做完复测。
4. **写回**：根因与修复方案用 `kata knowledge write --project <项目> --type pitfall --content <json>` 写回，下次同类问题直接复用。

## 规范

- 根因必须有命令输出支撑，事实与推断分开说；无证据不臆造根因或责任人。
- 只操作目标服务器；不改源码仓库。
- 凭据只存本机忽略的 `config/infra/credentials.yaml`；密码只经 `SSHPASS='<pw>' sshpass -e ssh ...` 环境变量传入，不出现在命令行参数、对话、日志里。
