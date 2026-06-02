# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/runners/smoke.spec.ts >> 【P1】数据质量规则库已引用自定义正则删除保护可核验
- Location: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/cases/t07-data-quality-shell.ts:119:1

# Error details

```
Error: SR-2099-01-DQ-RULEBASE-REGEX-DELETE-PROTECTION-L7670: 专用规则包应回显「自定义正则引用规则包-165」

expect(locator).toContainText(expected) failed

Locator: locator('body')
Expected substring: "自定义正则引用规则包-165"
Received string:    "DataAssets资产盘点元数据数据标准数据模型数据质量数据安全平台管理admin@dtstack.compw_test总览规则库配置规则集管理规则任务管理校验结果查询数据质量报告通用配置项目管理规则集管理编辑规则集基础信息2监控规则选择数据表选择数据源pw_test_HADOOP（SparkThrift2.x）选择数据库pw_test选择数据表dwd_voyah_dq_rule_01_main规则集描述规则包*规则包名称操作新增取 消下一步新增规则包查看全局参数完整性校验-字段级-空值数规则包_1779868200269添加规则收起完整性校验克隆生效范围字段级字段car_model_name 统计函数空值数过滤条件点击配置选项配置校验方法固定值期望值=强弱规则强规则规则描述有效性校验克隆字段owner_phone统计规则格式校验-自定义正则141新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则142新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则143新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则144新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则145新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则146新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则147新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则148新增自定义规则期望值固定值=过滤条件选项配置点击配置强弱规则强规则规则描述请选择规则包名称添加规则收起上一步保 存完整性校验-字段级-空值数规则包_1779868200269完整性校验-字段级-空值数规则包_1779868200269"
Timeout: 30000ms

Call log:
  - SR-2099-01-DQ-RULEBASE-REGEX-DELETE-PROTECTION-L7670: 专用规则包应回显「自定义正则引用规则包-165」 with timeout 30000ms
  - waiting for locator('body')
    2 × locator resolved to <body>…</body>
      - unexpected value "DataAssets资产盘点元数据数据标准数据模型数据质量数据安全平台管理admin@dtstack.compw_test总览规则库配置规则集管理规则任务管理校验结果查询数据质量报告通用配置项目管理规则集管理编辑规则集基础信息2监控规则选择数据表选择数据源pw_test_HADOOP（SparkThrift2.x）选择数据库pw_test选择数据表dwd_voyah_dq_rule_01_main规则集描述规则包*规则包名称操作新增取 消下一步新增规则包查看全局参数完整性校验-字段级-空值数规则包_1779868200269添加规则收起完整性校验克隆生效范围0字段car_model_name 统计函数3过滤条件点击配置选项配置校验方法1期望值=强弱规则强规则规则描述有效性校验克隆字段owner_phone统计规则33141新增自定义规则期望值1=过滤条件选项配置点击配置33142新增自定义规则期望值1=过滤条件选项配置点击配置33143新增自定义规则期望值1=过滤条件选项配置点击配置33144新增自定义规则期望值1=过滤条件选项配置点击配置33145新增自定义规则期望值1=过滤条件选项配置点击配置33146新增自定义规则期望值1=过滤条件选项配置点击配置33147新增自定义规则期望值1=过滤条件选项配置点击配置33148新增自定义规则期望值1=过滤条件选项配置点击配置强弱规则强规则规则描述请选择规则包名称添加规则收起上一步保 存完整性校验-字段级-空值数规则包_1779868200269完整性校验-字段级-空值数规则包_1779868200269"
    - locator resolved to <body>…</body>
    - unexpected value "DataAssets资产盘点元数据数据标准数据模型数据质量数据安全平台管理admin@dtstack.compw_test总览规则库配置规则集管理规则任务管理校验结果查询数据质量报告通用配置项目管理规则集管理编辑规则集基础信息2监控规则选择数据表选择数据源pw_test_HADOOP（SparkThrift2.x）选择数据库pw_test选择数据表dwd_voyah_dq_rule_01_main规则集描述规则包*规则包名称操作新增取 消下一步新增规则包查看全局参数完整性校验-字段级-空值数规则包_1779868200269添加规则收起完整性校验克隆生效范围字段级字段car_model_name 统计函数3过滤条件点击配置选项配置校验方法固定值期望值=强弱规则强规则规则描述有效性校验克隆字段owner_phone统计规则33141新增自定义规则期望值固定值=过滤条件选项配置点击配置33142新增自定义规则期望值固定值=过滤条件选项配置点击配置33143新增自定义规则期望值固定值=过滤条件选项配置点击配置33144新增自定义规则期望值固定值=过滤条件选项配置点击配置33145新增自定义规则期望值固定值=过滤条件选项配置点击配置33146新增自定义规则期望值固定值=过滤条件选项配置点击配置33147新增自定义规则期望值固定值=过滤条件选项配置点击配置33148新增自定义规则期望值固定值=过滤条件选项配置点击配置强弱规则强规则规则描述请选择规则包名称添加规则收起上一步保 存完整性校验-字段级-空值数规则包_1779868200269完整性校验-字段级-空值数规则包_1779868200269
                        
                        
                        
                      "
    2 × locator resolved to <body>…</body>
      - unexpected value "DataAssets资产盘点元数据数据标准数据模型数据质量数据安全平台管理admin@dtstack.compw_test总览规则库配置规则集管理规则任务管理校验结果查询数据质量报告通用配置项目管理规则集管理编辑规则集基础信息2监控规则选择数据表选择数据源pw_test_HADOOP（SparkThrift2.x）选择数据库pw_test选择数据表dwd_voyah_dq_rule_01_main规则集描述规则包*规则包名称操作新增取 消下一步新增规则包查看全局参数完整性校验-字段级-空值数规则包_1779868200269添加规则收起完整性校验克隆生效范围字段级字段car_model_name 统计函数空值数过滤条件点击配置选项配置校验方法固定值期望值=强弱规则强规则规则描述有效性校验克隆字段owner_phone统计规则格式校验-自定义正则141新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则142新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则143新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则144新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则145新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则146新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则147新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则148新增自定义规则期望值固定值=过滤条件选项配置点击配置强弱规则强规则规则描述请选择规则包名称添加规则收起上一步保 存完整性校验-字段级-空值数规则包_1779868200269完整性校验-字段级-空值数规则包_1779868200269
                        
                        
                        
                      "
    56 × locator resolved to <body>…</body>
       - unexpected value "DataAssets资产盘点元数据数据标准数据模型数据质量数据安全平台管理admin@dtstack.compw_test总览规则库配置规则集管理规则任务管理校验结果查询数据质量报告通用配置项目管理规则集管理编辑规则集基础信息2监控规则选择数据表选择数据源pw_test_HADOOP（SparkThrift2.x）选择数据库pw_test选择数据表dwd_voyah_dq_rule_01_main规则集描述规则包*规则包名称操作新增取 消下一步新增规则包查看全局参数完整性校验-字段级-空值数规则包_1779868200269添加规则收起完整性校验克隆生效范围字段级字段car_model_name 统计函数空值数过滤条件点击配置选项配置校验方法固定值期望值=强弱规则强规则规则描述有效性校验克隆字段owner_phone统计规则格式校验-自定义正则141新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则142新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则143新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则144新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则145新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则146新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则147新增自定义规则期望值固定值=过滤条件选项配置点击配置格式校验-自定义正则148新增自定义规则期望值固定值=过滤条件选项配置点击配置强弱规则强规则规则描述请选择规则包名称添加规则收起上一步保 存完整性校验-字段级-空值数规则包_1779868200269完整性校验-字段级-空值数规则包_1779868200269"

```

```yaml
- banner:
  - img "logo"
  - text: DataAssets
  - menu:
    - menuitem "资产盘点":
      - link "资产盘点":
        - /url: "#/assetsStatistics"
    - menuitem "元数据":
      - link "元数据":
        - /url: "#/metaDataCenter"
    - menuitem "数据标准":
      - link "数据标准":
        - /url: "#/standardStatistic"
    - menuitem "数据模型":
      - link "数据模型":
        - /url: "#/builtSpecificationTable"
    - menuitem "数据质量":
      - link "数据质量":
        - /url: "#/dq/overview"
    - menuitem "数据安全":
      - link "数据安全":
        - /url: "#/dataAuth/permissionAssign"
    - menuitem "平台管理":
      - link "平台管理":
        - /url: "#/dataSourceManage"
  - list:
    - button:
      - img
    - link "question-circle":
      - /url: /helpSite/docs/assets/root/summary/
      - img "question-circle"
    - link "message":
      - /url: http://shuzhan63-test-ltqc.k8s.dtstack.cn/portal/#/message?app=dataAssets
      - img "message"
    - img "setting"
    - text: admin@dtstack.com
- complementary:
  - combobox
  - text: pw_test
  - menu:
    - menuitem "总览":
      - link "总览":
        - /url: "#/dq/overview"
    - menuitem "规则库配置":
      - link "规则库配置":
        - /url: "#/dq/ruleBase"
    - menuitem "规则集管理":
      - link "规则集管理":
        - /url: "#/dq/ruleSet"
    - menuitem "规则任务管理":
      - link "规则任务管理":
        - /url: "#/dq/rule"
    - menuitem "校验结果查询":
      - link "校验结果查询":
        - /url: "#/dq/taskQuery"
    - menuitem "数据质量报告":
      - link "数据质量报告":
        - /url: "#/dq/qualityReport"
    - menuitem "通用配置"
    - menuitem "项目管理"
- main:
  - navigation:
    - list:
      - listitem:
        - link "规则集管理":
          - /url: "#/dq/ruleSet"
        - img "right"
      - listitem: 编辑规则集
  - button "check 基础信息":
    - img "check"
    - text: 基础信息
  - button "2 监控规则"
  - button "plus-square 新增规则包":
    - img "plus-square"
    - text: 新增规则包
  - button "查看全局参数"
  - combobox
  - text: 完整性校验-字段级-空值数规则包_1779868200269
  - button "添加规则 down":
    - text: 添加规则
    - img "down"
  - button "up 收起":
    - img "up"
    - text: 收起
  - img
  - text: 完整性校验
  - button "克隆"
  - button:
    - img
  - text: "* 生效范围"
  - combobox "* 生效范围"
  - text: 字段级 * 字段 car_model_name
  - combobox "* 字段"
  - text: "* 统计函数"
  - combobox "* 统计函数"
  - text: 空值数 过滤条件
  - button "过滤条件": 点击配置
  - combobox
  - text: 选项配置
  - textbox "请点击按钮进行配置" [disabled]
  - text: "* 校验方法"
  - combobox "* 校验方法"
  - text: 固定值 * 期望值
  - img "question-circle"
  - combobox "* 期望值 question-circle"
  - text: =
  - textbox "请填写数值": "0"
  - text: 强弱规则
  - img "question-circle"
  - combobox "强弱规则 question-circle"
  - text: 强规则 规则描述
  - textbox "规则描述":
    - /placeholder: 请填写规则描述
    - text: 校验空值数分区结果
  - img
  - text: 有效性校验
  - button "克隆"
  - button:
    - img
  - text: "* 字段"
  - combobox "* 字段"
  - text: owner_phone * 统计规则
  - combobox
  - text: 格式校验-自定义正则
  - combobox
  - text: "141"
  - button "新增自定义规则"
  - text: 期望值
  - combobox
  - text: 固定值
  - combobox
  - text: =
  - textbox "请输入数值": "0"
  - text: 过滤条件
  - combobox
  - text: 选项配置
  - textbox "请点击按钮进行配置" [disabled]
  - button "点击配置"
  - combobox
  - text: 格式校验-自定义正则
  - combobox
  - text: "142"
  - button "新增自定义规则"
  - text: 期望值
  - combobox
  - text: 固定值
  - combobox
  - text: =
  - textbox "请输入数值": "0"
  - text: 过滤条件
  - combobox
  - text: 选项配置
  - textbox "请点击按钮进行配置" [disabled]
  - button "点击配置"
  - combobox
  - text: 格式校验-自定义正则
  - combobox
  - text: "143"
  - button "新增自定义规则"
  - text: 期望值
  - combobox
  - text: 固定值
  - combobox
  - text: =
  - textbox "请输入数值": "0"
  - text: 过滤条件
  - combobox
  - text: 选项配置
  - textbox "请点击按钮进行配置" [disabled]
  - button "点击配置"
  - combobox
  - text: 格式校验-自定义正则
  - combobox
  - text: "144"
  - button "新增自定义规则"
  - text: 期望值
  - combobox
  - text: 固定值
  - combobox
  - text: =
  - textbox "请输入数值": "0"
  - text: 过滤条件
  - combobox
  - text: 选项配置
  - textbox "请点击按钮进行配置" [disabled]
  - button "点击配置"
  - combobox
  - text: 格式校验-自定义正则
  - combobox
  - text: "145"
  - button "新增自定义规则"
  - text: 期望值
  - combobox
  - text: 固定值
  - combobox
  - text: =
  - textbox "请输入数值": "0"
  - text: 过滤条件
  - combobox
  - text: 选项配置
  - textbox "请点击按钮进行配置" [disabled]
  - button "点击配置"
  - combobox
  - text: 格式校验-自定义正则
  - combobox
  - text: "146"
  - button "新增自定义规则"
  - text: 期望值
  - combobox
  - text: 固定值
  - combobox
  - text: =
  - textbox "请输入数值": "0"
  - text: 过滤条件
  - combobox
  - text: 选项配置
  - textbox "请点击按钮进行配置" [disabled]
  - button "点击配置"
  - combobox
  - text: 格式校验-自定义正则
  - combobox
  - text: "147"
  - button "新增自定义规则"
  - text: 期望值
  - combobox
  - text: 固定值
  - combobox
  - text: =
  - textbox "请输入数值": "0"
  - text: 过滤条件
  - combobox
  - text: 选项配置
  - textbox "请点击按钮进行配置" [disabled]
  - button "点击配置"
  - combobox
  - text: 格式校验-自定义正则
  - combobox
  - text: "148"
  - button "新增自定义规则"
  - text: 期望值
  - combobox
  - text: 固定值
  - combobox
  - text: =
  - textbox "请输入数值": "0"
  - text: 过滤条件
  - combobox
  - text: 选项配置
  - textbox "请点击按钮进行配置" [disabled]
  - button "点击配置"
  - button "minus-circle":
    - img "minus-circle"
  - button "minus-circle":
    - img "minus-circle"
  - button "minus-circle":
    - img "minus-circle"
  - button "minus-circle":
    - img "minus-circle"
  - button "minus-circle":
    - img "minus-circle"
  - button "minus-circle":
    - img "minus-circle"
  - button "minus-circle":
    - img "minus-circle"
  - button "plus-circle":
    - img "plus-circle"
  - button "minus-circle":
    - img "minus-circle"
  - text: 强弱规则
  - img "question-circle"
  - combobox "强弱规则 question-circle"
  - text: 强规则 规则描述
  - textbox "规则描述":
    - /placeholder: 请填写规则描述
    - text: 引用手机号正则-已引用验证删除保护
  - combobox
  - text: 请选择规则包名称
  - button:
    - img
  - button "添加规则 down":
    - text: 添加规则
    - img "down"
  - button "up 收起":
    - img "up"
    - text: 收起
  - button "上一步"
  - button "保 存"
```

# Test source

```ts
  4145 | async function ensureReferencedCustomRegexFixture(page: Page, sourceRef: string): Promise<void> {
  4146 |   const existingReferenced = (await listCustomRegexRecords(page, sourceRef)).find(
  4147 |     (record) => Number(record.associationRuleCount) > 0,
  4148 |   );
  4149 |   if (existingReferenced) return;
  4150 | 
  4151 |   const ruleName = "手机号正则-已引用";
  4152 |   await deleteCustomRegexByNameBestEffort(page, sourceRef, ruleName);
  4153 |   await createCustomRegexFixture(page, sourceRef, {
  4154 |     ruleName,
  4155 |     ruleType: 3,
  4156 |     associationScope: 1,
  4157 |     ruleDesc: "验证已引用自定义正则删除保护",
  4158 |     ruleContent: "^1[3-9]\\d{9}$",
  4159 |   });
  4160 |   const createdRuleId = expectNonEmptyString(
  4161 |     (await listCustomRegexRecords(page, sourceRef)).find((record) => record.ruleName === ruleName)?.id,
  4162 |     `${sourceRef}: 自定义正则 fixture 创建后应返回 id`,
  4163 |   );
  4164 | 
  4165 |   const packageName = await attachCustomRegexToArchiveRuleSet(page, sourceRef, ruleName, createdRuleId);
  4166 |   await ensureReferencedCustomRegexRuleTask(page, sourceRef, ruleName, packageName);
  4167 |   await expect
  4168 |     .poll(
  4169 |       async () => {
  4170 |         const records = await listCustomRegexRecords(page, sourceRef);
  4171 |         return records.find((record) => record.ruleName === ruleName)?.associationRuleCount ?? 0;
  4172 |       },
  4173 |       {
  4174 |         message: `${sourceRef}: 自定义正则 ${ruleName} 应被规则集引用`,
  4175 |         timeout: 60000,
  4176 |       },
  4177 |     )
  4178 |     .not.toBe("0");
  4179 | }
  4180 | 
  4181 | async function attachCustomRegexToArchiveRuleSet(
  4182 |   page: Page,
  4183 |   sourceRef: string,
  4184 |   ruleName: string,
  4185 |   ruleId: string,
  4186 | ): Promise<string> {
  4187 |   const tableName = "dwd_voyah_dq_rule_01_main";
  4188 |   const ruleSetRecords = await queryRuleSetRecords(page, tableName);
  4189 |   const targetRuleSet = ruleSetRecords.find((record) => record.tableName === tableName);
  4190 |   expect(targetRuleSet?.id, `${sourceRef}: 应存在可挂载自定义正则的规则集 ${tableName}`).toBeTruthy();
  4191 | 
  4192 |   await gotoDataQualityPage(page, `/dq/ruleSet/edit/${targetRuleSet?.id}?projectId=${PROJECT_ID}`);
  4193 |   const body = page.locator("body");
  4194 |   await expect(body, `${sourceRef}: 规则集编辑页应打开`).toContainText(/编辑规则集|添加规则/, {
  4195 |     timeout: 30000,
  4196 |   });
  4197 |   if (!(await page.getByText("添加规则", { exact: true }).first().isVisible({ timeout: 3000 }).catch(() => false))) {
  4198 |     await clickDqCompactButton(page, "下一步", sourceRef);
  4199 |   }
  4200 | 
  4201 |   const packageName = `自定义正则引用规则包-${ruleId}`;
  4202 |   await createDedicatedRuleSetPackage(page, sourceRef, packageName);
  4203 |   await page.getByText("添加规则", { exact: true }).first().click({ timeout: 30000 });
  4204 |   await page.getByText("有效性校验", { exact: true }).last().click({ timeout: 30000 });
  4205 |   await selectRuleSetStatisticFunctionBySearch(page, "自定义正则", "格式校验-自定义正则", sourceRef);
  4206 |   await selectRuleSetField(page, "owner_phone", sourceRef);
  4207 |   await selectRuleSetCustomRuleBySearch(page, ruleName, sourceRef);
  4208 |   await configureRuleSetCustomRegexExpectation(page, sourceRef, ruleName);
  4209 |   await switchRuleSetStrength(page, "强规则", sourceRef);
  4210 |   await fillRuleSetRuleDescription(page, `引用${ruleName}验证删除保护`);
  4211 |   await saveRuleSetRuleRow(page, sourceRef, "新增已引用自定义正则规则");
  4212 |   await clickRuleSetSubmitButton(page, sourceRef);
  4213 |   await expect
  4214 |     .poll(
  4215 |       async () => {
  4216 |         const currentDetail = await queryRuleSetDetail(page, sourceRef, targetRuleSet?.id);
  4217 |         return findRuleSetPackageReferencingCustomRegex(currentDetail, ruleId, ruleName)?.packageName ?? "";
  4218 |       },
  4219 |       {
  4220 |         message: `${sourceRef}: 规则集详情应保存自定义正则「${ruleName}」引用`,
  4221 |         timeout: 60000,
  4222 |       },
  4223 |     )
  4224 |     .not.toBe("");
  4225 |   const detail = await queryRuleSetDetail(page, sourceRef, targetRuleSet?.id);
  4226 |   const savedPackage = findRuleSetPackageReferencingCustomRegex(detail, ruleId, ruleName);
  4227 |   return expectNonEmptyString(savedPackage?.packageName, `${sourceRef}: 自定义正则引用应归属到规则包`);
  4228 | }
  4229 | 
  4230 | async function createDedicatedRuleSetPackage(page: Page, sourceRef: string, packageName: string): Promise<void> {
  4231 |   await clickRuleSetPackageAddButton(page, sourceRef);
  4232 |   const visiblePackageInput = page.locator('input[placeholder="请输入规则包名称"]:visible').last();
  4233 |   if (await visiblePackageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
  4234 |     await visiblePackageInput.fill(packageName, { timeout: 30000 });
  4235 |     await visiblePackageInput.press("Tab", { timeout: 30000 });
  4236 |   } else {
  4237 |     const packageCombobox = page.locator(".ant-select:visible").filter({ hasText: "请选择规则包名称" }).last();
  4238 |     await expect(packageCombobox, `${sourceRef}: 新增规则包后应展示规则包名称选择框`).toBeVisible({
  4239 |       timeout: 30000,
  4240 |     });
  4241 |     await packageCombobox.click({ force: true, timeout: 30000 });
  4242 |     await page.keyboard.type(packageName);
  4243 |     await page.keyboard.press("Enter");
  4244 |   }
> 4245 |   await expect(page.locator("body"), `${sourceRef}: 专用规则包应回显「${packageName}」`).toContainText(packageName, {
       |                                                                                ^ Error: SR-2099-01-DQ-RULEBASE-REGEX-DELETE-PROTECTION-L7670: 专用规则包应回显「自定义正则引用规则包-165」
  4246 |     timeout: 30000,
  4247 |   });
  4248 | 
  4249 |   const packageSelect = page.locator(".ant-select:visible").filter({ hasText: /规则包|请选择规则包名称/ }).first();
  4250 |   if (
  4251 |     (await packageSelect.isVisible({ timeout: 3000 }).catch(() => false)) &&
  4252 |     !((await packageSelect.textContent({ timeout: 30000 })) ?? "").includes(packageName)
  4253 |   ) {
  4254 |     await packageSelect.click({ timeout: 30000 });
  4255 |     const clicked = await clickActiveAntdOption(page, packageName);
  4256 |     expect(clicked, `${sourceRef}: 规则包下拉应包含专用规则包「${packageName}」`).toBe(true);
  4257 |   }
  4258 | }
  4259 | 
  4260 | async function ensureReferencedCustomRegexRuleTask(
  4261 |   page: Page,
  4262 |   sourceRef: string,
  4263 |   ruleName: string,
  4264 |   packageName: string,
  4265 | ): Promise<void> {
  4266 |   const tableName = "dwd_voyah_dq_rule_01_main";
  4267 |   const taskName = `已引用自定义正则删除保护任务-${ruleName}`;
  4268 |   const existingTask = (await queryRuleTaskRecords(page, tableName)).find((record) => record.ruleName === taskName);
  4269 |   if (existingTask) return;
  4270 | 
  4271 |   const body = await gotoNewRuleTaskMonitorObjectPageForTable(page, sourceRef, taskName, tableName);
  4272 |   await configureManualPartition(page, sourceRef, "stat_date='20260116'");
  4273 |   await clickNextUntilMonitorRuleConfig(page, sourceRef);
  4274 |   await selectRuleTaskRulePackageOnCurrentPage(page, sourceRef, [packageName], "有效性校验");
  4275 |   await clickNextUntilScheduleConfig(page, sourceRef);
  4276 |   await chooseDqFieldOptionByText(page, /调度周期/, "手动触发", sourceRef);
  4277 |   await chooseDqFieldOptionByText(page, /规则拼接包/, "1", sourceRef);
  4278 |   await chooseFirstDqSelectOption(page, /资源组/, sourceRef);
  4279 |   await chooseDqFieldOptionByText(page, /实例生成方式/, "立即生成", sourceRef);
  4280 |   await chooseDqFieldOptionByText(page, /超时时间/, "不限制", sourceRef);
  4281 |   await checkDqNoReport(page, sourceRef);
  4282 | 
  4283 |   const saveResponse = waitForRuleTaskPageQuery(page);
  4284 |   void saveResponse.catch(() => {});
  4285 |   const createResponse = page
  4286 |     .waitForResponse(
  4287 |       (response) =>
  4288 |         response.request().method() === "POST" &&
  4289 |         /\/dassets\/v1\/valid\/monitor\/(add|save|edit|update|addOrUpdate)/.test(response.url()),
  4290 |       { timeout: 60000 },
  4291 |     )
  4292 |     .catch(() => null);
  4293 |   await clickDqSubmitButton(page, sourceRef);
  4294 |   const createPayload = await createResponse.then((response) => response?.json().catch(() => null));
  4295 |   if (createPayload) {
  4296 |     expect(
  4297 |       createPayload.success ?? createPayload.code === 1,
  4298 |       `${sourceRef}: 新建规则任务 ${taskName} 应请求成功，实际返回 ${JSON.stringify(createPayload)}`,
  4299 |     ).toBe(true);
  4300 |   }
  4301 |   await expect(page, `${sourceRef}: 规则任务 ${taskName} 保存后应返回规则任务管理`).toHaveURL(/\/dq\/rule(?:\?|$)/, {
  4302 |     timeout: 60000,
  4303 |   });
  4304 |   const savedPayload = await saveResponse.catch(() => undefined);
  4305 |   if (savedPayload) {
  4306 |     expect(savedPayload.success ?? savedPayload.code === 1, `${sourceRef}: 保存任务 ${taskName} 后列表应刷新成功`).toBe(
  4307 |       true,
  4308 |     );
  4309 |   }
  4310 |   await expect
  4311 |     .poll(async () => (await queryRuleTaskRecords(page, tableName)).some((record) => record.ruleName === taskName), {
  4312 |       message: `${sourceRef}: 保存后规则任务列表 API 应返回 ${taskName}`,
  4313 |       timeout: 60000,
  4314 |     })
  4315 |     .toBe(true);
  4316 | }
  4317 | 
  4318 | async function queryRuleSetDetail(
  4319 |   page: Page,
  4320 |   sourceRef: string,
  4321 |   id: string | number | undefined,
  4322 | ): Promise<DqRuleSetRecord> {
  4323 |   expect(id, `${sourceRef}: 查询规则集详情应有 id`).toBeTruthy();
  4324 |   const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleSet/detail"), {
  4325 |     data: { id: String(id) },
  4326 |     headers: { [PROJECT_STORAGE_KEY]: String(PROJECT_ID) },
  4327 |     timeout: 60000,
  4328 |   });
  4329 |   expect(response.ok(), `${sourceRef}: 查询规则集详情 HTTP 应成功`).toBe(true);
  4330 |   return expectDqSuccess(
  4331 |     (await response.json()) as DqApiResponse<DqRuleSetRecord>,
  4332 |     `${sourceRef}: 查询规则集详情应请求成功`,
  4333 |   );
  4334 | }
  4335 | 
  4336 | function findRuleSetPackageReferencingCustomRegex(
  4337 |   detail: DqRuleSetRecord,
  4338 |   ruleId: string,
  4339 |   ruleName: string,
  4340 | ): DqRuleSetPackage | undefined {
  4341 |   for (const rulePackage of detail.packageVOList ?? []) {
  4342 |     const rules = rulePackage.rules ?? [];
  4343 |     const matched = rules.some((rule) => ruleSetRuleReferencesCustomRegex(rule, ruleId, ruleName));
  4344 |     if (matched) return rulePackage;
  4345 |   }
```