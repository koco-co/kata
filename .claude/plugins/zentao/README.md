# 禅道 Bug 集成插件

从禅道 Bug 链接自动提取缺陷详情、复现步骤和修复分支，转化为线上问题用例。

## 功能

- 解析禅道 Bug URL（支持 zentao 和 zenpms 域名）
- 自动爬取 Bug 标题、描述、优先级、状态等
- 提取修复分支信息（若已关联）
- 生成可追溯的线上问题用例归档

## 环境配置

在项目根目录 `.env` 文件中配置：

```env
# 禅道服务器地址（必填）
KATA_ZENTAO_BASE_URL="http://zenpms.dtstack.cn"

# 浏览器/API cookie（与完整账号密码二选一）
KATA_ZENTAO_COOKIE="zentaosid=..."

# cookie 失效时用于自动重新登录并更新 .env
KATA_ZENTAO_ACCOUNT="your-username"
KATA_ZENTAO_PASSWORD="your-password"
```

## 获取 ZENTAO 凭证

1. 访问禅道服务器（如 http://zenpms.dtstack.cn）
2. 使用公司账号登录
3. 在用户设置中获取 API Token（可选，优先使用密码）
4. 把 cookie 或账号密码写入根目录 `.env`；旧 `.kata/zentao/session.json` 使用 `kata env migrate-zentao-session --session .kata/zentao/session.json` 迁移

## 用法

```bash
# 从禅道 Bug 链接导入
bun run .claude/plugins/zentao/fetch.ts --bug-id 138845 --output workspace/issues/

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

- 禅道 cookie 和密码只存储在根目录 `.env` 中，**不要提交到版本控制**
- 确保账号有权限访问所有 Bug 记录
- 首次使用前检查禅道服务器地址是否正确
