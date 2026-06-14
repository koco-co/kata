# 诊断 Playbook

按报错类型选择分步诊断路径。**所有只读命令可以自动执行；任何破坏性命令都要先告知用户、经用户确认再做。**

通用前置：先从线索中解析出主机（IP/域名）和端口（如 `jdbc:hive2://172.16.124.114:10000/` → host `172.16.124.114`, port `10000`），在本地判断连通性，再决定是否需要 SSH 登录。

## 本地连通性分层

1. `ping -c 3 <host>` —— 看主机是否可达。
2. `nc -vz -w 5 <host> <port>`（或 `telnet <host> <port>`）—— 看端口是否监听、能否连上。
3. 据结果分流：
   - ping 不通 + 端口不通 → 网络/路由/主机宕机问题（见「No route to host」）。
   - ping 通但端口不通 → 服务未启动、未监听，或被防火墙拦截（登录后排查服务和防火墙）。
   - 端口通但业务仍报错 → 服务自身或鉴权/配置问题（登录后查日志）。

## 典型案例

### Hive: `java.net.NoRouteToHostException: No route to host`

报错形如 `jdbc:hive2://<host>:10000/: No route to host (Host unreachable)`，说明 TCP 层就没连上。

只读诊断顺序：

1. 本地 `ping -c 3 <host>`、`nc -vz -w 5 <host> 10000`。
2. SSH 登录（见 `ssh-protocol.md`）后只读检查：
   - `systemctl status hive-server2 2>/dev/null || systemctl status hiveserver2 2>/dev/null` —— 服务状态。
   - `ss -tlnp | grep 10000`（或 `netstat -tlnp | grep 10000`）—— 端口是否监听。
   - `ps -ef | grep -i hiveserver2 | grep -v grep` —— 进程是否存活。
   - `systemctl status firewalld 2>/dev/null; iptables -L -n | grep -E '10000|DROP|REJECT'` —— 防火墙是否拦截。
   - `journalctl -u hiveserver2 --no-pager -n 100`（或 Hive 日志目录 `tail -n 100`）—— 启动/崩溃原因。

常见根因与对应修复（**修复都是破坏性操作，先确认**）：

- 服务进程已退出 → 重启 HiveServer2（如 `systemctl restart hiveserver2`）。
- 防火墙拦截 10000 → 放行端口（如 `firewall-cmd --add-port=10000/tcp --permanent && firewall-cmd --reload`）。
- 主机宕机/网络不通（ping 都不通）→ 大概率是目标机或网络侧问题，SSH 登录本身可能就会失败；此时记录证据、向用户反馈，不得臆测。

### 数据库（MySQL/PostgreSQL 等）连接被拒/超时

- `Connection refused` → 服务未启动或未监听目标端口：登录后跑 `ss -tlnp | grep <port>`、`systemctl status <db>`。
- `timeout` / `No route to host` → 同上，按网络/防火墙分层排查。
- 鉴权失败（端口通但报 access denied）→ 属配置或账号问题，登录后查配置和账号，不得在网络层兜圈。

## 边界

- 只读诊断命令尽量串行执行，保留输出摘要作为根因证据。
- SSH 登录失败（主机不可达或凭据错误）时，不得反复盲试；按 `ssh-protocol.md` 补凭据，或向用户反馈 pending。
