# Diff 扫描：dt-center-assets release-6.3.x-ltqc 与 test-6.3.x-ltqc

- 输入：`origin/release-6.3.x-ltqc` 对 `origin/test-6.3.x-ltqc-v6.4.10.2`

## 结论

发现 4 个需要修复或确认的代码问题（critical 0、major 3、minor 1）。

## 证据

- 扫描来源为两分支 diff；下列位置、现象和根因均保留自原始扫描结果。

## 发现

### b-001（major）

`service/src/main/java/com/dtstack/assets/service/valid/impl/MonitorRuleTemplateService.java:136`：`MonitorRuleTemplateService.incrementInit()` 未同步纳入新 `functionId` 46/47/49/50/51，已有项目无法通过增量初始化获得新的内置规则模板。

根因：`incrementInit()` 已改用基于 `functionId` 的差量初始化，但硬编码筛选列表仍为 `Arrays.asList(42,43,44,45)`。

### b-002（minor）

`service/src/main/java/com/dtstack/assets/service/valid/impl/JsonValidationConfigService.java:1193`：`checkBasicParam()` 中 `value` 长度超限时提示“必填项未填写”，而不是“长度超限”。

根因：`value` 长度校验分支复用了错误文案；同方法的 `name` 字段分支已有“长度超限”文案可作为对照。

### b-003（major）

`web/src/main/java/com/dtstack/assets/controller/valid/JsonValidationConfigController.java:106`：`deleteJsonFormatBatch` 校验了 `getId()` 而不是 `getIds()`，批量参数校验形同虚设。

根因：`JsonFormatDeleteParam.id` 为基本类型，不可能为 null；service 实际使用的是 `param.getIds()`，校验字段与业务字段不一致。

### b-004（major）

`service/src/main/java/com/dtstack/assets/service/valid/function/Impl/ValueEnumRangeFunctionServiceImpl.java:83`：仅配置取值或仅配置枚举时，生成的 SQL 可能包含悬挂运算符。

根因：`buildValueRangeSql` 和 `buildEnumRangeSql` 在入参为 null 时返回空字符串，但 `generateValueEnumRangeConditions` 无论两侧是否为空都拼接中间运算符。

## 建议

- 更新增量初始化的内置 `functionId` 列表，并增加已有项目升级回归。
- 修正 `value` 长度校验文案并覆盖超限分支。
- 将批量删除参数校验目标改为 `getIds()`，增加空列表和合法列表测试。
- 对取值/枚举单边配置分别生成合法 SQL，并补充双边、单边和空配置测试。
