# 常见问题排查指南

## 安装问题

### bun install 失败

**现象**:
```
error: workspace 'engine' not found
error: workspace 'tools/dtstack-sdk' not found
```

**排查步骤**:
1. 确认 Bun 版本 >= 1.3: `bun --version`
2. 确认在仓库根目录执行: `ls package.json`
3. 清除缓存后重试:
   ```bash
   rm -rf node_modules
   bun install --no-cache
   ```

**已知原因**:
- 在子目录而非根目录执行 `bun install`。
- Bun 版本过低（低于 1.3 可能不支持部分 workspace 特性）。
- `bun.lock` 与 `package.json` 不一致（删除 `bun.lock` 后重新 `bun install`）。

### Biome 版本不匹配

**现象**:
```
The current version of Biome doesn't match the required version
```

**解决**: 确认 biome.json 中要求的版本与 devDependencies 中的 `@biomejs/biome` 版本一致。

### TypeScript 编译错误

**现象**: `tsc --noEmit` 报类型错误。

**解决**: `bun install` 后确认 `node_modules` 存在。如果使用的是 `workspace:*` 依赖，先确认 workspace 包已构建。

---

## Worktree 状态不一致

### Worktree 无法创建

**现象**:
```
fatal: 'worktrees/<name>' already exists
```

**解决**:
```bash
# 确认 worktree 是否已注册
git worktree list

# 如果已注册但目录异常，先移除
git worktree remove .worktrees/<name> 2>/dev/null || true
git branch -D <branch> 2>/dev/null || true

# 重新创建
```

### Worktree 合并后残留

**现象**: 合并后 worktree 目录仍存在，或 git branch 显示已合并但未删除。

**标准清理流程**:
```bash
# 1. 切换到 main 分支
git checkout main

# 2. 合并 worktree 分支（如果尚未合并）
git merge --no-ff <branch>

# 3. 推送 main
git push origin main

# 4. 移除 worktree
git worktree remove .worktrees/<slug>

# 5. 删除分支
git branch -d <branch>
```

### Worktree 处于 detached HEAD

**现象**: 在 worktree 内执行 `git status` 显示 `HEAD detached at ...`。

**原因**: worktree 创建时可能基于非分支引用。

**解决**:
```bash
# 从当前 HEAD 创建分支
git checkout -b <branch-name>
```

---

## 测试失败

### bun test 在 worktree 内失败

**现象**: 测试失败但 main 分支上测试通过。

**排查**:
1. 确认 worktree 的 node_modules 是最新的：
   ```bash
   ls node_modules  # 应在仓库根目录
   ```
2. 如果 node_modules 缺失，在仓库根目录执行 `bun install`。
3. 检查是否有未提交的更改影响测试。

### 特定测试子集失败

**现象**: 全量测试通过但某个子集失败。

**解决**:
```bash
# 运行具体区域测试排查
bun test engine/tests/skills/
bun test engine/tests/cli/
bun test engine/tests/schemas/

# 带详细输出
bun test --verbose engine/tests/<area>
```

### Runtime skill 同步校验失败

**现象**:
```
runtime skill sync failed
runtime detach failed
route check failed
skill graph check failed
workflow check failed
```

**解决**:
```bash
# 验证修复
bun run check:skills
```

---

## 权限问题

### SSH 连接被拒绝

**现象**: `ssh: connect to host <host> port 22: Connection refused`

**排查**:
1. 确认主机 IP/域名正确。
2. 确认目标服务器 SSH 服务运行中：
   ```bash
   nc -zv <host> 22
   ```
3. 查看 `.kata/infra/credentials.yaml` 中凭据是否正确。
4. 尝试默认凭据：`root` / `Abc!@#135`。
5. 问用户获取正确的凭据，填写后写回 credentials.yaml。

### Playwright 浏览器启动失败

**现象**: `browserType.launch: Executable doesn't exist at ...`

**解决**:
```bash
# 安装 Playwright 浏览器
bunx playwright install

# 仅安装 chromium（推荐）
bunx playwright install chromium
```

### 权限拒绝（Permission Denied）

**现象**:
```
Error: EACCES: permission denied
```

**解决**:
- 确认文件/目录所有者：`ls -la`
- 如果是 `.kata/repos/` 下的文件，这是只读证据源，不应修改。

---

## 构建与配置问题

### kata 命令找不到

**现象**: `kata: command not found`

**解决**:
```bash
# 使用完整路径
bun engine/bin/kata <command>

# 或从仓库根目录运行
cd /path/to/kata
bun engine/bin/kata <command>
```

### 配置校验失败

**现象**: `kata config` 报错。

**解决**:
```bash
# 确认配置文件存在
[ -f .env ] || cp .env.example .env
[ -f .env.envs ] || cp .env.envs.example .env.envs
[ -f config.json ] || cp config.example.json config.json
# 编辑 .env 填写必需的环境变量（见 INSTALL.md）
```

### .env.local 配置问题

**现象**: 运行 skill 时缺少环境变量。

**解决**:
1. 确认 `.env.local` 存在并包含所需变量（见 CLAUDE.local.md）。
2. 常见必需变量：
   - `KATA_ZENTAO_PASSWORD` — ZenTao API
   - `KATA_LANHU_COOKIE` / `KATA_LANHU_PASSWORD` — Lanhu 设计稿
   - `KATA_TARGET_ENV` — 目标环境标识

---

## 产物问题

### XMind 打不开或显示异常

**常见原因**:
- 单节点内容过长（超长 SQL、步骤、预期）。
- 单节点包含过多换行或项目符号。
- XMind 版本不兼容（推荐 XMind 2024+）。

**修复**:
- 超长内容拆分为多个子节点。
- 连续动作列表使用真实换行分隔。
- 运行 `kata cases lint` 检查 XMind 结构。

### Archive MD 与 XMind 不一致

**现象**: Archive 和 XMind 的用例数量、标题、步骤不同。

**修复**: 通过 `case-edit` skill 重新同步两者。
```markdown
输入: "同步 features/<slug>/ 下的 archive.md 和 cases.xmind"
```

---

## 其他

### 日志级别调整

```bash
# 开启详细日志
KATA_DEBUG=true bun engine/bin/kata <command>
```

### Runtime 契约修改后

修改 `.claude/**`、`.agents/**` 或 `docs/skills/contracts/**` 后，必须：
```bash
# 1. 跑 runtime 契约检查
bun run check:skills

# 2. 跑相关测试
bun test engine/tests/skills/
```
