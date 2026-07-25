---
name: infra-diagnose
description: 数据源/数据库/服务器连通性报错（JDBC No route to host、连接超时、连接被拒等）时，SSH 登录目标机只读排查、定位根因并修复，把可复用结论写回知识库。纯前端运行时报错、无需 SSH 的转 defect-analyze。
---

# infra-diagnose

目标：定位连通性故障根因并修复，把可复用的排查结论写回知识库。

## 流程

1. **查知识库**：`kata knowledge read --project <项目> --type pitfall --keyword <报错关键词或主机>`，命中优先复用既有方案。
2. **只读诊断**：从报错解析主机与端口（JDBC URL 只用于解析，不含凭据）；本地 `ping -c 3 <host>`、`nc -vz -w 5 <host> <port>` 分层；需要登录时用 SSH（见下）做只读检查（systemctl status / ss -tlnp / ps / iptables -L / journalctl）。
3. **修复**：只读命令可直接执行；破坏性命令（重启服务、改防火墙、改配置、kill、rm）先说明在哪台机执行什么、预期影响，用户确认后执行，做完复测。
4. **写回**：根因与修复方案用 `kata knowledge write --project <项目> --type pitfall --status verified --title <标题> --body <md>` 写回（含报错关键词、环境、根因、诊断摘要、修复步骤）；单次观察未复测用 `--status observed`，确认后加 `--confirmed`。

## SSH 规约

- 凭据按优先级：`config/infra/credentials.yaml`（本机忽略，不进 git）→ 环境变量 `KATA_INFRA_DEFAULT_USER` / `KATA_INFRA_DEFAULT_PASSWORD` → 问用户（拿到后立即写回 credentials.yaml）。
- 连接用 `SSHPASS='<password>' sshpass -e ssh -o StrictHostKeyChecking=no -o ConnectTimeout=8 <user>@<host> '<cmd>'`，密码只走环境变量；禁止 `sshpass -p` 把明文写进命令行。
- 登录失败不反复盲试，按上面顺序补凭据或向用户反馈。

## 约束

- 根因必须有命令输出支撑，事实与推断分开说；无证据不臆造。
- 只操作目标服务器；不改源码仓库。
