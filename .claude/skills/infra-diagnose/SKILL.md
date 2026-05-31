---
name: infra-diagnose
description: 出现数据源/数据库/服务器连通性报错(如 JDBC No route to host、连接超时或被拒)，要 SSH 登机排查并修复时用；并沉淀凭据与排查知识。
when_to_use: 出现数据源或服务器连通性报错、需登机排查时用。纯前端运行时报错且无需登机 → defect-analyze；只查改业务知识 → knowledge-curate。
argument-hint: "<数据源/服务器报错 | 主机 | JDBC 错误>"
user-invocable: true
model: sonnet
effort: high
---

# infra-diagnose

收到数据源/服务器故障线索后：先查本地知识库，再 SSH 只读诊断定位根因，破坏性修复前确认，最后把结论沉淀回知识库。

## 路由边界

- 触发：数据源/服务器连通性报错需登机；JDBC/数据库报 No route to host、超时或被拒；用户要求 SSH 诊断或修复。
- 改走：纯前端运行时报错且无需登机 → defect-analyze；仅查询/更新业务知识 → knowledge-curate。

## 工作流

1. 先检索 `.kata/infra/knowledge/`（按报错关键词、主机、端口）；命中既有条目优先复用其方案。
2. 未命中：读 `references/diagnostic-playbook.md` 按报错类型分步只读诊断；登机规约见 `references/ssh-protocol.md`。
3. 定位根因或完成修复后，按 `references/knowledge-format.md` 写回知识条目，下次同类问题可直接复用。

## 何时加载哪个文件

| 文件                              | 何时读     | 作用                                    |
| --------------------------------- | ---------- | --------------------------------------- |
| references/diagnostic-playbook.md | 自行排查时 | 按报错类型的分步只读诊断与对症修复      |
| references/ssh-protocol.md        | 需要登机时 | SSH 连接、凭据读取/补充、破坏性命令门控 |
| references/knowledge-format.md    | 收尾沉淀时 | 知识条目检索流程与落盘格式              |

## 硬规则（不变量）

- 凭据从 `.kata/infra/credentials.yaml` 按 host 读取；缺失先用默认 `root`/`Abc!@#135` 试连，仍失败再直接询问用户并立即写回，下次不再问同一主机。
- JDBC URL（如 `jdbc:hive2://host:10000/`）只解析主机与端口，不携带账号密码——不据此编造凭据。
- SSH 统一 `SSHPASS=<pw> sshpass -e ssh ...`，密码经环境变量传入，不写进 `ps` 可见的命令行。
- 只读诊断（ping/nc/systemctl status/journalctl/ss/ps 等）可自动执行；破坏性操作（重启/改防火墙/kill/改配置）须先告知命令与影响、经用户确认，执行后复测。
- 根因必须有命令输出支撑，区分事实与推断；无证据不臆造根因或负责人。
- 只操作目标服务器与本地 `.kata/infra/`，不得改动 `.kata/repos/**` 源仓库。
