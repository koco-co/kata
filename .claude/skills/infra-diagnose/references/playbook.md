# 诊断 playbook

按报错类型选诊断路径。**所有只读命令可直接执行；破坏性命令先告知、经确认再做、做完复测。**

## 第 0 步：解析线索

从报错里解析主机与端口（如 `jdbc:hive2://172.16.124.114:10000/` → host `172.16.124.114`、port `10000`）。JDBC URL 只用于解析主机端口，里面没有账号密码，不得据此编造凭据。

## 本地连通性分层

1. `ping -c 3 <host>` —— 主机是否可达。
2. `nc -vz -w 5 <host> <port>` —— 端口是否监听。
3. 分流：
   - ping 不通 + 端口不通 → 网络 / 路由 / 主机宕机（见下「No route to host」）。
   - ping 通但端口不通 → 服务未启动 / 未监听 / 防火墙拦截（登录后查服务和防火墙）。
   - 端口通但业务报错 → 服务自身或鉴权 / 配置问题（登录后查日志与配置）。

## SSH 执行规约

凭据来源按优先级：

1. `config/infra/credentials.yaml`（本机忽略，不进 git）按 host 查 username / password / port。
2. 环境变量 `KATA_INFRA_DEFAULT_USER` / `KATA_INFRA_DEFAULT_PASSWORD` 试连；未配置则跳过。
3. 都失败就问用户；拿到后立即写回 `config/infra/credentials.yaml`，下次不再问。

连接命令（密码走环境变量，不进 `ps`）：

```shell
SSHPASS='<password>' sshpass -e ssh -o StrictHostKeyChecking=no -o ConnectTimeout=8 <user>@<host> '<remote-command>'
```

非默认端口加 `-p <port>`。禁止 `sshpass -p '<password>'` 把明文写进命令行参数。

credentials.yaml 格式：

```yaml
hosts:
  <host-ip>:
    username: <username>
    password: "<password>"
    port: 22
    note: 可选备注（环境/集群）
```

SSH 登录失败（不可达或鉴权错）不反复盲试，按上面流程补凭据或向用户反馈。

## 典型案例

### Hive：`NoRouteToHostException: No route to host`

TCP 层就没连上。只读诊断顺序：

1. 本地 `ping` / `nc` 分层（见上）。
2. SSH 登录后只读检查：
   - `systemctl status hive-server2 2>/dev/null || systemctl status hiveserver2 2>/dev/null` —— 服务状态。
   - `ss -tlnp | grep 10000` —— 端口是否监听。
   - `ps -ef | grep -i hiveserver2 | grep -v grep` —— 进程是否存活。
   - `systemctl status firewalld 2>/dev/null; iptables -L -n | grep -E '10000|DROP|REJECT'` —— 防火墙。
   - `journalctl -u hiveserver2 --no-pager -n 100` —— 启动 / 崩溃原因。

常见根因 → 修复（破坏性，先确认）：进程退出 → `systemctl restart hiveserver2`；防火墙拦截 → `firewall-cmd --add-port=10000/tcp --permanent && firewall-cmd --reload`；主机 / 网络不通 → 记录证据报给用户，不臆测。

### 数据库连接被拒 / 超时

- `Connection refused` → 服务未启动或未监听：`ss -tlnp | grep <port>`、`systemctl status <db>`。
- `timeout` / `No route to host` → 按网络 / 防火墙分层排查。
- 端口通但 access denied → 账号 / 配置问题，查配置和账号，不在网络层兜圈。

## 写回知识库

根因确认后写回，内容含：报错关键词、主机环境、根因、诊断命令摘要、修复步骤。用 `kata knowledge write --type pitfall --status verified --title <标题> --body <md>`；单次观察未复测用 `--status observed`，向用户确认后加 `--confirmed`。
