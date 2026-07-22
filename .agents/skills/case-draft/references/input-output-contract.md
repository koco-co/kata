# Case Draft 输入输出合同

## 输入

最小输入是一个可读取的需求来源或一段明确的功能说明。以下字段按必要性分组：

### 会改变目录或范围

- `project`
- `feature_version`（版本需求）
- `suite_name`
- 需求标识（项目确实以该标识组织产物时）

无法唯一推断时，应一次性询问；不要用文件名或目录名猜测正式值。

### 可稍后校准

- 客户环境的菜单与按钮文案
- 字段限制、提示语和枚举展示顺序
- 非关键展示名称

缺少这些内容时可先生成 `requirements-draft`，并在相关位置写 `待确认`。

## 来源记录

内部结构可继续使用 `source_ref` 字段，但用户可见文档称为“来源记录”。至少保存：

```yaml
id: SR-001
kind: prd | screenshot | ui | source | user
location: <文件、页面或用户消息说明>
summary: <该来源支持的简短结论>
checked_at: <ISO-8601，可选>
```

哈希用于去重和变更检测，不应出现在用例正文。

## 输出目录

```text
<feature>/
├── metadata.yaml
├── cases/
│   ├── archive.draft.md        # 有待确认项时
│   ├── archive.md              # 最终版
│   ├── cases.xmind             # 仅从最终版生成
│   └── unresolved-summary.md   # 仍需确认的内容
└── .process/
    ├── source-snapshot.json
    ├── coverage-matrix.json
    └── case-source-map.json    # 新名称；过渡期由迁移器读取旧文件名
```

## 覆盖与覆盖冲突

- 目标文件不存在：创建。
- 已有草稿：按 `case_id` 合并，保留用户修改。
- 已有最终版：先生成差异；只有用户任务明确要求更新时才替换。
- 同一 `case_id` 内容冲突且无法自动判断：保留两版，写入冲突清单。
- XMind 永远由当前最终 `archive.md` 重新生成，不手工双向修改。

## 推荐检查入口

目标形态：

```bash
kata cases check --project <project> --feature <feature-id> --format json
```

过渡期使用现有命令：

```bash
kata cases lint --scope <feature-dir> --exit-code
kata cases validate <feature-id> --project <project>
kata cases verify --project <project> --feature <feature-id> --exit-code
```

Skill 只解释检查结果，不在提示词中复制 Schema 规则。
