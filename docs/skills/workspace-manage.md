# workspace-manage

## 功能说明

kata 工作区管理入口。显示 kata 功能菜单、创建新项目工作区、初始化工作区目录结构、自检工作区状态、收尾（验证产物完整性）以及修复工作区配置问题。

## 输入

- **project** (optional): workspace ID，指定要管理的工作区项目。
- **request** (required): 用户请求内容，如"创建项目"、"初始化"、"自检"等。

**示例**:
```
/workspace-manage
/workspace-manage --project=dataAssets
"创建新项目工作区"
"帮我检查当前工作区状态"
```

## 输出

- **menu**: 功能菜单，列出所有可用的 kata 能力和入口。
- **workspace**: 工作区创建/初始化/自检/修复的结果。

## 执行流程

1. **接收请求**：解析用户意图（菜单/创建/初始化/自检/收尾/修复）。
2. **查看布局**：加载 `references/project-layout.md` 了解工作区目录结构。
3. **执行操作**：
   - **菜单**：列出所有活跃 skills 和命令索引。
   - **创建**：创建新的 `workspace/{project}/` 目录结构。
   - **初始化**：初始化已有项目工作区的配置和元数据。
   - **自检**：检查工作区目录完整性、配置正确性。
   - **收尾**：验证产物完整性和一致性。
   - **修复**：修复检测到的工作区问题。
4. **输出结果**：根据操作类型返回菜单、状态报告或验证结果。

## 产物要求

- 所有产物写入 `workspace/{project}/` 目录下。
- `workspace/{project}/.kata/repos/**` 为只读源仓库，不可改动。

## 参考

- `.ai/core/skills/workspace-manage/skill.yaml`
- `.ai/core/skills/workspace-manage/references/project-layout.md`
- `.ai/core/rules/repo-readonly.md`
