# infra-diagnose

## 功能说明

SSH 登录目标服务器，排查并修复数据源与服务器连通性故障。自动沉淀凭据与排查知识以便复用。主要应对 JDBC/数据库连接报错（No route to host、超时、连接被拒绝）等基础设施故障。

## 输入

- **clue** (required): 故障线索，可以是：
  - JDBC 连接错误（jdbc:hive2://host:10000/...）
  - No route to host / 连接超时 / 连接被拒绝
  - 服务器 SSH 连接失败
  - 数据源不可用报错
- **project** (optional): workspace ID。

**示例**:
```
"JDBC 连接 No route to host: jdbc:hive2://10.0.0.1:10000/"
"Hive 查询报错: Could not open client transport"
"SSH 连不上 192.168.1.100"
```

## 输出

- **diagnosis**: 排查诊断报告，包含：
  - 执行过的排查命令与输出
  - 根因分析（区分事实与推断）
  - 修复方案（只读诊断后确定）或待确认的破坏性操作
  - 知识沉淀记录

## 执行流程

### 1. lookup_knowledge

- 按报错关键词、主机、端口检索 `.kata/infra/knowledge/`。
- 命中既有条目则优先复用其方案。

### 2. diagnose

- 未命中时，开始 SSH 诊断。
- 凭据从 `.kata/infra/credentials.yaml` 按 host 读取。
- 缺失时用默认凭据试连，仍失败则询问用户。
- 自动执行只读诊断命令：
  - `ping <host>`
  - `nc -zv <host> <port>`
  - `telnet <host> <port>`
  - `systemctl status <service>`
  - `journalctl -u <service>`
  - `netstat -tlnp` / `ss -tlnp`
  - `docker ps`（容器化环境）

### 3. propose_or_apply_fix

- 破坏性操作（重启/改防火墙/kill/改配置）须先告知命令并经用户确认。
- 非破坏性修复可自动执行。

### 4. record_knowledge

- 定位根因或修复后，将症状、报错原文、根因、排查命令与输出摘要、解决方案、主机端口写入 `.kata/infra/knowledge/` 新条目。

## 产物要求

### 诊断报告

必须包含：
- 故障现象和报错原文
- 执行的排查命令列表及输出摘要
- 根因分析（区分事实与推断）
- 修复方案（只读诊断结果 + 破坏性操作说明）

### 知识沉淀

排查后必须沉淀知识到 `.kata/infra/knowledge/`：
- 症状
- 报错原文
- 根因
- 排查命令与输出摘要
- 解决方案
- 主机与端口

### 安全约束

**SSH 凭据**:
- 凭据从 `.kata/infra/credentials.yaml` 读取。
- SSH 命令格式: `SSHPASS=<pw> sshpass -e ssh -o StrictHostKeyChecking=no -o ConnectTimeout=8 root@<host>`
- 禁止把明文密码拼进 ps 可见的命令行。
- 新获取的凭据立即写回 credentials.yaml。

**只读原则**:
- 只读诊断自动执行。
- 破坏性操作须先告知命令并经用户确认。
- `.kata/repos/**` 源码仓库不可改动。

### 环境变量

| 变量 | 说明 |
|------|------|
| `KATA_TARGET_ENV` | 目标环境标识 |
| `KATA_SOURCE_REPOS` | 源码仓库路径 |

## 参考

- `.ai/core/skills/infra-diagnose/skill.yaml`
- `.ai/core/skills/infra-diagnose/references/diagnostic-playbook.md`
- `.ai/core/skills/infra-diagnose/references/ssh-protocol.md`
- `.ai/core/skills/infra-diagnose/references/knowledge-format.md`
