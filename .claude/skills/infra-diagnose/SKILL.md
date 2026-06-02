---
name: infra-diagnose
description: 出现数据源/数据库/服务器连通性报错(如 JDBC No route to host、连接超时或被拒)，SSH 登机只读排查并修复，并记录凭据与排查知识。纯前端运行时报错且无需登机改用 defect-analyze；只查改业务知识改用 knowledge-curate。
argument-hint: "<数据源/服务器报错 | 主机 | JDBC 错误>"
user-invocable: true
model: sonnet
effort: high
---

# infra-diagnose

收到数据源/服务器故障线索后，按这个顺序走：先查本地知识库，再 SSH 只读诊断定位根因，做破坏性修复前先确认，最后把结论写回知识库。

## 路由边界

description 已经覆盖触发场景，这里只说明什么时候改走别的 skill：

- 纯前端运行时报错、不用登机 → defect-analyze。
- 只查询或更新业务知识 → knowledge-curate。

## 工作流

1. 先按报错关键词、主机、端口检索 `.kata/infra/knowledge/`；命中既有条目就优先复用它的方案。
2. 没命中：读 `references/diagnostic-playbook.md`，按报错类型分步做只读诊断；登机规约见 `references/ssh-protocol.md`。
3. 定位根因或修复完成后，按 `references/knowledge-format.md` 把知识条目写回，下次遇到同类问题可以直接复用。

## 何时加载哪个文件

| 文件                              | 何时读     | 作用                                  |
| --------------------------------- | ---------- | ------------------------------------- |
| references/diagnostic-playbook.md | 自行排查时 | 按报错类型分步只读诊断，再对症修复    |
| references/ssh-protocol.md        | 需要登机时 | SSH 连接、读取或补充凭据、破坏性命令把关 |
| references/knowledge-format.md    | 收尾记录时 | 知识条目怎么检索、怎么写回             |

## 必须遵守的规则

- 凭据按 host 从 `.kata/infra/credentials.yaml` 读取；读不到就先用默认 `root`/`Abc!@#135` 试连，还是失败再直接问用户，问到后立即写回，下次同一主机不再问。
- JDBC URL（如 `jdbc:hive2://host:10000/`）只解析主机与端口，里面没有账号密码。不要据此编造凭据。
- SSH 统一用 `SSHPASS=<pw> sshpass -e ssh ...`，密码经环境变量传入，不写进 `ps` 看得到的命令行。这样密码不会在进程列表里泄漏。
- 只读诊断（ping/nc/systemctl status/journalctl/ss/ps 等）可以自动执行；破坏性操作（重启/改防火墙/kill/改配置）必须先把命令和影响告诉用户，等用户确认后再执行，执行完再复测一遍。破坏性命令可能加重故障，也可能波及其它服务。
- 根因必须有命令输出支撑，分清哪些是事实、哪些是推断；没有证据就不要臆造根因或责任人。
- 只动目标服务器和本地 `.kata/infra/`，不得改动 `.kata/repos/**` 源仓库。
