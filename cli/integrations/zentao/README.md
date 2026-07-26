# 禅道 Bug 集成插件

从禅道 Bug 链接自动提取缺陷详情、复现步骤和修复分支，转化为线上问题用例。

## 功能

- 解析禅道 Bug URL（支持 zentao 和 zenpms 域名）
- 自动爬取 Bug 标题、描述、优先级、状态等
- 提取修复分支信息（若已关联）
- 生成可追溯的线上问题用例归档

## 配置

复制 `config/plugin/zentao.example.yaml` 为本机私密的
`config/plugin/zentao.yaml`：

```yaml
schema_version: 1
base_url: "http://zenpms.example"
cookie: "zentaosid=..."
username: "your-username"
password: "your-password"
```

也可以通过 `KATA_ZENTAO_*` 环境变量做一次性覆盖。

## 获取 ZENTAO 凭证

1. 访问禅道服务器（如 http://zenpms.dtstack.cn）
2. 使用公司账号登录
3. 把 Cookie 或账号密码写入本机 `config/plugin/zentao.yaml`

## 用法

```bash
# 从禅道 Bug 链接导入
bun run cli/integrations/zentao/fetch.ts --bug-id 138845 --output workspace/dataAssets/analyses/

# 或通过 kata 命令（自动解析链接）
分析一下冲突 http://zenpms.dtstack.cn/zentao/bug-view-138845.html
```

## 输出格式

生成的线上问题用例文件包含：

- Bug 标题和编号
- 复现步骤（从 Bug 描述提取）
- 修复分支信息
- 关联的源码仓库（若已关联）
- 前置条件和测试数据

## 注意事项

- 禅道 Cookie 和密码只存储在本机私密配置中，**不要提交到版本控制**
- 确保账号有权限访问所有 Bug 记录
- 首次使用前检查禅道服务器地址是否正确
