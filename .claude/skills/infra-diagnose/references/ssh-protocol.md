# SSH 执行规约

本技能用本地 `sshpass`（`/opt/homebrew/bin/sshpass`）加 `ssh` 登录目标服务器执行命令。

## 凭据来源（按优先级）

1. **本地凭据库** `.kata/infra/credentials.yaml`：按 host 查找已记录的 `username`/`password`/`port`。
2. **默认凭据**：未命中时先用 `root` / `Abc!@#135` 试连。
3. **询问用户**：默认凭据仍失败（鉴权错误）时，直接问用户该主机的用户名/密码（或非默认端口）。凭据是自由文本，普通追问即可，不必套 AskUserQuestion 选项。
   - 获得后**立即写回** `.kata/infra/credentials.yaml`，下次同一主机不再询问。

JDBC URL（如 `jdbc:hive2://host:10000/`）仅用于解析主机与端口，**其中不含账号密码**，不得据此编造凭据。

### `.kata/infra/credentials.yaml` 格式

```yaml
hosts:
  172.16.124.114:
    username: root
    password: "Abc!@#135"
    port: 22
    note: 可选备注，如所属环境/集群
```

`.kata/` 已被仓库 `.gitignore` 整目录忽略，明文密码不会进 git。

## 连接命令

密码经环境变量传入，不会出现在 `ps` 进程列表中：

```shell
SSHPASS='<password>' sshpass -e ssh -o StrictHostKeyChecking=no -o ConnectTimeout=8 <username>@<host> '<remote-command>'
```

- 默认端口 22；非默认端口加 `-p <port>`。
- 一次执行一组只读诊断命令，保留 stdout/stderr 摘要作为根因证据。
- 禁止形如 `sshpass -p '<password>' ...` 把明文密码直接写进命令行参数。

## 破坏性操作把关

- **只读命令**（`ping`/`nc`/`telnet`/`systemctl status`/`journalctl`/`ss`/`netstat`/`ps`/`cat`/`tail`/`iptables -L` 等查看类）可以直接执行。
- **破坏性命令**（`systemctl restart|stop`、`kill`、`firewall-cmd`/`iptables` 改规则、改配置文件、`rm` 等）执行前必须做到三点：
  1. 向用户说明在哪台主机执行什么命令、预期影响；
  2. 等用户确认后再执行；
  3. 执行后复测（重新跑对应的只读诊断），确认是否修复。

## 失败处理

- 主机 `ping`/SSH 都不可达：大概率是网络问题或目标机宕机，SSH 登录本身就会失败。记录证据，向用户反馈 pending，不得反复盲试。
- 鉴权失败：按上述凭据流程补凭据，不得无限重试默认密码。
