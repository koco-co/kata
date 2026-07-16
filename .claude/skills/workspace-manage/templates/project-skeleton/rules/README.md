# {{project}} 项目级规则

本目录下的规则覆盖全局 `rules/`。优先级：用户当前指令 > 项目规则 > 全局规则 > skill 内置。

## 如何添加项目级规则

1. 直接在本目录新建 `.md` 文件，或参考其他项目 `workspace/{project}/_shared/rules/` 下的同名文件改写
2. 修改该文件即可（保留 frontmatter 若有）
3. 规则加载由以下命令完成：
   `kata rules load --project {{project}}`

## 常见场景

- 用例编写规范：新建或改写 `case-writing.md`
- XMind 结构约束：新建或改写 `xmind-structure.md`
- 仅项目独有规则：直接新建 `.md` 文件（如 `hotfix-frontmatter.md`）
