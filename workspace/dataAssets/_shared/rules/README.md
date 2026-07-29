# dataAssets 项目级规则

本目录下的规则覆盖全局 `rules/`。优先级：用户当前指令 > 项目级 rules > 全局 rules > skill 内置。

## 如何添加项目级规则

1. 从仓库根目录 `rules/` 拷贝需要覆盖的 `.md` 文件到本目录
2. 修改该文件即可（保留 frontmatter 若有）
3. 规则无需命令加载：CLI 与 skill 在执行任务时直接读取本目录的 `.md` 文件生效

## 常见场景

- 覆盖用例编写规范：拷贝 `rules/case-writing.md` 到本目录修改
- 覆盖 XMind 展示结构约束：修改 `xmind-structure.md`；Root 名称和禅道模块 ID 统一改根目录 `config/xmind/projects.yaml`
- 仅项目独有规则：直接新建 `.md` 文件（如 `hotfix-frontmatter.md`）
