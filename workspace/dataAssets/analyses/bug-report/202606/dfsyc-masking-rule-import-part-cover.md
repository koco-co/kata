---
title: "dfsyc 脱敏规则导入重复覆盖后部分覆盖位数未更新"
project: "dataAssets"
customer: "东风商用车"
branches:
  backend: "dt-center-assets@release_6.3.x_dfsyc"
  frontend: "dt-insight-studio@dataAssets/release_6.3.x_dfsyc"
created_at: "2026-06-02"
severity: "P1"
status: "待修复"
source_type: "用户截图 + 导入模板 + 源码静态分析"
---

# dfsyc 脱敏规则导入重复覆盖后部分覆盖位数未更新

## 缺陷概述

在「数据安全 > 数据脱敏管理」导入脱敏规则时，同名规则选择「重复覆盖更新」后，部分覆盖规则的「脱敏起始位数 / 脱敏结束位数」没有按导入文件更新。

用户提供的导入模板中，`Sheet1` 第 2 行为：

| 规则名称 | 脱敏方式 | 脱敏起始位数 | 脱敏结束位数 | 脱敏替换字符 | 原字符 | 替换字符 |
| --- | --- | --- | --- | --- | --- | --- |
| full2 | 部分脱敏 | 1 | 7 | * | @ | § |

## 结论

导入链路未将部分脱敏的起止位从 DTO 字符串显式转换并写回实体；同名规则覆盖时还只查询了 id 和名称，导致导入值没有可靠落库。

## 实际行为

导入后打开规则 `full2` 的编辑弹窗，页面显示为「部分覆盖」，但部分覆盖配置仍为 `1、1、*`，结束位没有更新为导入模板中的 `7`。

## 预期行为

导入同名规则并选择「重复覆盖更新」后，规则 `full2` 的部分覆盖配置应更新为：

| 脱敏起始位数 | 脱敏结束位数 | 脱敏替换字符 |
| --- | --- | --- |
| 1 | 7 | * |

## 复现步骤

1. 进入「数据安全 > 数据脱敏管理」。
2. 准备一个已存在的同名脱敏规则，例如 `full2`。
3. 点击「导入规则」，选择「重复覆盖更新」。
4. 上传 `/Users/poco/Downloads/rule_import_template_副本.xlsx`。
5. 导入成功后，在列表中点击 `full2` 的「编辑」。
6. 查看「部分覆盖方式」中的起始位、结束位、替换字符。

## 根因

后端导入链路为：

`DataMaskingRuleController.importMaskRule` -> `DataMaskingRuleService.importMaskRule` -> `MaskingRuleListener`

## 证据

源码证据：

| evidence_ref | 说明 |
| --- | --- |
| `dt-center-assets@release_6.3.x_dfsyc:web/src/main/java/com/dtstack/assets/controller/masking/DataMaskingRuleController.java:189-199` | `/dataMaskingRule/importRule` 接口接收 `MaskRuleImportParam` 和 `importFile` 后调用 `dataMaskingRuleService.importMaskRule`。 |
| `dt-center-assets@release_6.3.x_dfsyc:service/src/main/java/com/dtstack/assets/service/masking/DataMaskingRuleService.java:206-223` | 服务层使用 EasyExcel 读取 `DataMaskRuleImportDTO`，处理逻辑委托给 `MaskingRuleListener`。 |
| `dt-center-assets@release_6.3.x_dfsyc:service/src/main/java/com/dtstack/assets/service/masking/dto/DataMaskRuleImportDTO.java:35-44` | 导入 DTO 中 `startPosition`、`endPosition` 定义为 `String`。 |
| `dt-center-assets@release_6.3.x_dfsyc:dao/src/main/java/com/dtstack/assets/model/masking/DataMaskingRule.java:42-49` | 落库实体 `DataMaskingRule.startPosition/endPosition` 定义为 `Integer`。 |
| `dt-center-assets@release_6.3.x_dfsyc:service/src/main/java/com/dtstack/assets/service/masking/listener/MaskingRuleListener.java:86-107` | listener 只对部分脱敏的起止位字符串做了合法性校验，没有把校验后的字符串显式转换为 Integer 并写回实体。 |
| `dt-center-assets@release_6.3.x_dfsyc:service/src/main/java/com/dtstack/assets/service/masking/listener/MaskingRuleListener.java:136-161` | 重复覆盖时按名称找到已有规则，随后 `BeanUtils.copyProperties(dto, maskingRule)`，再只手动设置 `maskingType` 和转译配置，未手动设置 `startPosition/endPosition`。 |
| `dt-center-assets@release_6.3.x_dfsyc:service/src/main/java/com/dtstack/assets/service/masking/DataMaskingRuleService.java:279-285` | `listByNames` 查询已有规则时只 select `id` 和 `maskingRuleName`，因此覆盖更新实体中原有起止位也不会被带出来。 |
| `dt-insight-studio@dataAssets/release_6.3.x_dfsyc:apps/dataAssets/src/views/platformManage/dataDesensitization/components/importRuleModal/index.tsx:25-31` | 前端导入弹窗仅把 `importRule` 和文件提交给后端，没有加工部分覆盖字段。 |
| `dt-insight-studio@dataAssets/release_6.3.x_dfsyc:apps/dataAssets/src/views/platformManage/dataDesensitization/components/addRuleModal/index.tsx:154-169` | 编辑弹窗直接使用列表 `record.startPosition/endPosition/replaceChar` 回显，因此页面显示的 `1、1、*` 来自后端返回数据。 |

结论：导入 DTO 的起止位字段是 `String`，实体字段是 `Integer`，当前导入成功路径依赖 `BeanUtils.copyProperties`，但没有对 `startPosition/endPosition` 做显式类型转换赋值；覆盖同名规则时又只查询了 `id/name`，最终 `start_position/end_position` 未按导入文件更新，表现为仍保留旧值或在新增导入场景中为空后由前端默认显示为 `1`。

## 影响范围

- 影响「导入规则」中脱敏方式为「部分脱敏」的记录。
- 选择「重复覆盖更新」时，同名规则的 `start_position/end_position` 不能可靠更新。
- 若导入新增「部分脱敏」规则，也存在 `start_position/end_position` 未落库的风险。
- 手动新增/编辑规则链路暂未发现同类映射问题：前端表单提交的是数值字段，后端 `addOrUpdate` 直接复制到 `DataMaskingRule`。

## 建议

在 `MaskingRuleListener` 构造 `DataMaskingRule` 时显式写入部分脱敏字段，不依赖 `BeanUtils` 做跨类型转换：

```java
if (MaskingTypeEnum.PART.getName().equals(dto.getMaskingType())) {
    maskingRule.setStartPosition(NumberUtil.parseInt(dto.getStartPosition()));
    maskingRule.setEndPosition(NumberUtil.parseInt(dto.getEndPosition()));
    maskingRule.setReplaceChar(dto.getReplaceChar());
}
```

同时建议补充覆盖导入回归：

1. 已存在同名规则，原配置 `1、1、*`；导入 `部分脱敏 / 1 / 7 / *` 且 `importRule=2`，断言数据库更新为 `start_position=1,end_position=7,replace_char='*'`。
2. 新增导入部分脱敏规则，断言起止位与替换字符完整落库。
3. 非部分脱敏导入时，确认起止位/替换字符是否按产品预期清空或忽略，避免旧值残留。

## 验证范围

- 已读取用户附件：`/Users/poco/Downloads/rule_import_template_副本.xlsx`，确认第 2 行期望值为 `1、7、*`。
- 已静态查看后端分支：`dt-center-assets@release_6.3.x_dfsyc`。
- 已静态查看前端分支：`dt-insight-studio@dataAssets/release_6.3.x_dfsyc`。
- 未切换源码仓库分支；本报告通过 `git show` 读取目标分支源码。
- 未执行接口级导入复现，未连接数据库校验落库结果；当前结论基于用户截图、导入模板和源码静态分析。
