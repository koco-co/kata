# Kata

面向 QA 用例、自动化与工程知识的 CLI 工作区。命令见 `kata --help`，安装见 [INSTALL.md](./INSTALL.md)，完整约定见 [AGENTS.md](./AGENTS.md)。

## 验证纪律
- 改动落盘即运行受影响范围测试；失败在当前 worktree 查明根因，不得用 skip、TODO 或注释绕过。未执行完整范围不得声称全部通过。
- 新代码须有测试；不得硬编码路径或 secrets；workspace 文件用动态路径（`paths.ts`）。

## 业务用例
- 修复 `workspace/**/cases/*.yaml` 时必须结合 PRD、测试点、产品页面和项目知识逐条进行模型语义级修复，不得仅按字面满足 lint；禁止使用脚本、正则或批量文本替换机械改写业务用例；脚本只可用于只读扫描、统计、lint、build 和派生产物生成。
- YAML 用例未通过 `kata cases lint` 前不得交由用户验收。

### Lint 规则优化建议

- 编写或修复用例期间发现 `kata cases lint` 规则本身误报、漏报时，主动向用户提出规则优化建议；在用例验收前发现即提，不得拖到验收之后。
- 发现误报时不得擅自改用例去绕开 lint；应先暂停绕过动作，等用户决定。
- 逐个决策提问，一次只问一个问题，并给出推荐答案；多个问题时按影响面从大到小排序。
- 建议至少包含：规则名或违规点、当前误报/漏报用例、规则判断错误原因、建议判定边界或校验方式。
- 用户确认前不得修改 lint 代码、skill 文件、knowledge 条目或 AGENTS.md；确认后按「用例规范变更分流」落地。

### 用例规范变更分流

收到「用例格式/内容调整」诉求时先判断属于**公共范畴**还是**项目专属范畴**：

- **公共范畴**：与具体客户无关的通用写法（标题公式、前置条件分界、占位符、SQL 生成、表单「怎么写进 action」规范）。应更新 test-case skill 文件（`examples/best-practices.md`/`examples/cases.yaml`/`SKILL.md` 等），须经用户确认。
- **项目专属范畴**：绑定具体客户/需求的表单配置细节（某页面的字段名、必填、顺序、级联）。应更新 `knowledge/standards/<customer>/<module>.md`，须经用户确认。

判断流程：
- **高置信度**（需求含明确客户名、用例属于标品/岚图/浙商等明确平台 → 自行定位，直接读对应 `--customer` 规范即可）
- **低置信度**（跨客户通用？客户归属模糊？某一配置项无法确定是公共还是专属？）→ 先基于知识库/源码/DOM 验证，给出推荐答案并说明依据，再向用户确认公共或专属

确认前禁止直接修改 skill 文件或 knowledge 条目。

## 变更与校验
- 优先扩大对应 lint 的校验范围；新增规则必须覆盖实际失败路径，lint 失败信息给出规则、位置、原因和可执行修复建议。
- 任何任务判断需要修改 `SKILL.md` 或 `config/` 下 YAML 时，必须先向用户说明拟修改文件、原因、影响和替代方案并取得明确同意。

## 提交粒度
- 按改动点分次 commit，消息格式 `<emoji> <type>: <short description>`；参考既有 git 提交历史，不得整体一次性提交。

## 设计立场
- 默认 dry-run；稳定 ID 与不可重建信息不得无提示覆盖。
- 库函数只返回结果或抛出带错误码的错误，不得调用 `process.exit()`。
- Biome 负责格式化（`bun run check`）；偏好不可变模式，小文件（200-400 行，上限 800）；严格 TS。

## 注释语言
- 公开 API/类型定义 JSDoc：英文。
- 内部实现注释与分隔注释：中文；同一文件内同一类注释不得中英混杂。

## 安全红线
- secrets 不展开、不回显、不进日志与 Git；私密 YAML、Cookie、session 路径不进提示词、fixture 或跟踪文件。
- `.repos/` 的 `writable: false` 是声明式约束，由 `kata repos` 写看守强制执行，不依赖模型自律。

## Playwright 硬闸
- exit 0 不算证据：须 `status.json` 为 `command_passed`、Allure 结果落盘、被测平台产生核心流程业务记录。
- 单个 feature 交付：`kata automation lint <featureDir> --exit-code` + `kata automation lint --shared --project <project> --exit-code`。
- 项目级交付：`kata automation lint --all-features --project <project> --exit-code` 并继续检查共享代码。

## CLI 文档同步
- 任何 CLI 命令、子命令、参数、默认值或行为调整，必须同步更新 `cli/README.md`、对应 help 和 CLI 文档同步测试。

## Config 文档同步
- 结构类变更必须运行 `kata config docs` 重写 `config/README.md` 生成区并保持 `kata config docs --check` 通过。
- 策略类变更同步更新手写区。禁止为旧布局提供别名、回退或 migrate；旧路径字面量被 `kata config validate` 残留守卫拒绝。

## 自动化用例文件名
- `automation/tests/cases/` 下正式脚本统一用 `c0001-<lowercase-english-kebab-slug>.spec.ts`；slug 持久化到 cases YAML 的 `automation.spec_file`。
- 标题后续调整不自动重算既有 slug；迁移和 runner 同步以 YAML 声明的 `spec_file` 为准，缺失脚本不得生成通用占位。

## 产物位置与命名
- `config/policies/repo-policy.yaml` 是受控产物路由规则。历史输入放 `cases/imports/`，YAML 是唯一中间态，派生文件只放 `cases/exports/` 且不进 Git。
- 正式自动化源码只放 `automation/tests/`，一次性代码只可放未跟踪的 `runs/<run-id>/_tmp/`。
- policy 没有合适产物类型时，必须先说明拟生成内容、建议路径和命名并取得用户同意；获同意后同变更更新 policy、文档和校验测试。

## 本地上下文
- 只调整语气或声明默认值，不得定义路由、策略、写入范围、插件权限、引用要求或输出模式。
