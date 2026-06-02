# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/runners/smoke.spec.ts >> 【P0】数据质量规则库内置规则导出文件内容可核验
- Location: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/cases/t07-data-quality-shell.ts:85:1

# Error details

```
Error: SR-2099-01-DQ-RULEBASE-EXPORT-L7613: 导出文件应包含列「规则状态」

expect(received).toContain(expected) // indexOf

Expected substring: "规则状态"
Received string:    "规则名称
规则解释
规则分类
关联范围
关联规则数
规则描述
表行数检测
表行数，固定值
完整性校验
单表
0
针对表行数的数量校验，可配置表行数>/>=/</<=/=/!=某个数值。
表行数检测
表行数，1天波动检测
完整性校验
单表
0
针对表行数的1天波动率校验，计算方法为｜（今日表行数-昨日表行数）｜/昨日表行数。可配置1天波动率>/>=/</<=/=/!=某个百分比。
表行数检测
表行数，7天波动检测
完整性校验
单表
0
针对表行数的7天波动率校验，计算方法为｜（今日表行数-7日前表行数）｜/7日前表行数。可配置7天波动率>/>=/</<=/=/!=某个百分比。
表行数检测
表行数，月度波动检测
完整性校验
单表
0
针对表行数的月度波动率校验，计算方法为｜（今日表行数-上月同天表行数）｜/上月同天表行数。可配置月度波动率>/>=/</<=/=/!=某个百分比。
表行数检测
表行数，7天平均值波动检测
完整性校验
单表
0
针对表行数的7天平均值波动率校验，计算方法为｜（今日表行数-近7日平均表行数）｜/近7日平均表行数。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。
表行数检测
表行数，月度平均值波动检测
完整性校验
单表
0
针对表行数的月度平均值波动率校验，计算方法为｜（今日表行数-上月同天至昨日的平均表行数）｜/上月同天至昨日的平均表行数。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。
NULL值检测
空值数，固定值
完整性校验
字段
1
针对字段空值数的数量校验，可配置字段空值数>/>=/</<=/=/!=某个数值。
NULL值检测
空值数，1天波动检测
完整性校验
字段
0
针对字段空值数的1天波动率校验，计算方法为｜（今日字段空值数-昨日字段空值数）｜/昨日字段空值数。可配置1天波动率>/>=/</<=/=/!=某个百分比。
NULL值检测
空值数，7天波动检测
完整性校验
字段
0
针对字段空值数的7天波动率校验，计算方法为｜（今日字段空值数-7日前字段空值数）｜/7日前字段空值数。可配置7天波动率>/>=/</<=/=/!=某个百分比。
NULL值检测
空值数，月度波动检测
完整性校验
字段
0
针对字段空值数的月度波动率校验，计算方法为｜（今日字段空值数-上月同天字段空值数）｜/上月同天字段空值数。可配置月度波动率>/>=/</<=/=/!=某个百分比。
NULL值检测
空值数，7天平均值波动检测
完整性校验
字段
0
针对字段空值数的7天平均值波动率校验，计算方法为｜（今日字段空值数-近7日平均字段空值数）｜/近7日平均字段空值数。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。
NULL值检测
空值数，月度平均值波动检测
完整性校验
字段
0
针对字段空值数的月度平均值波动率校验，计算方法为｜（今日字段空值数-上月同天至昨日的平均字段空值数）｜/上月同天至昨日的平均字段空值数。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。
NULL值检测
空值率，固定值
完整性校验
字段
0
针对字段空值率的数量校验，可配置字段空值率>/>=/</<=/=/!=某个数值。
NULL值检测
空值率，1天波动检测
完整性校验
字段
0
针对字段空值率的1天波动率校验，计算方法为｜（今日字段空值率-昨日字段空值率）｜/昨日字段空值率。可配置1天波动率>/>=/</<=/=/!=某个百分比。
NULL值检测
空值率，7天波动检测
完整性校验
字段
0
针对字段空值率的7天波动率校验，计算方法为｜（今日字段空值率-7日前字段空值率）｜/7日前字段空值率。可配置7天波动率>/>=/</<=/=/!=某个百分比。
NULL值检测
空值率，月度波动检测
完整性校验
字段
0
针对字段空值率的月度波动率校验，计算方法为｜（今日字段空值率-上月同天字段空值率）｜/上月同天字段空值率。可配置月度波动率>/>=/</<=/=/!=某个百分比。
NULL值检测
空值率，7天平均值波动检测
完整性校验
字段
0
针对字段空值率的7天平均值波动率校验，计算方法为｜（今日字段空值率-近7日平均字段空值率）｜/近7日平均字段空值率。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。
NULL值检测
空值率，月度平均值波动检测
完整性校验
字段
0
针对字段空值率的月度平均值波动率校验，计算方法为｜（今日字段空值率-上月同天至昨日的平均字段空值率）｜/上月同天至昨日的平均字段空值率。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。
空串检测
空串率，固定值
完整性校验
字段
0
针对字段空串率的数量校验，可配置字段空串率>/>=/</<=/=/!=某个数值。
空串检测
空串率，1天波动检测
完整性校验
字段
0
针对字段空串率的1天波动率校验，计算方法为｜（今日字段空串率-昨日字段空串率）｜/昨日字段空串率。可配置1天波动率>/>=/</<=/=/!=某个百分比。
空串检测
空串率，7天波动检测
完整性校验
字段
0
针对字段空串率的7天波动率校验，计算方法为｜（今日字段空串率-7日前字段空串率）｜/7日前字段空串率。可配置7天波动率>/>=/</<=/=/!=某个百分比。
空串检测
空串率，月度波动检测
完整性校验
字段
0
针对字段空串率的月度波动率校验，计算方法为｜（今日字段空串率-上月同天字段空串率）｜/上月同天字段空串率。可配置月度波动率>/>=/</<=/=/!=某个百分比。
空串检测
空串率，7天平均值波动检测
完整性校验
字段
0
针对字段空串率的7天平均值波动率校验，计算方法为｜（今日字段空串率-近7日平均字段空串率）｜/近7日平均字段空串率。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。
空串检测
空串率，月度平均值波动检测
完整性校验
字段
0
针对字段空串率的月度平均值波动率校验，计算方法为｜（今日字段空串率-上月同天至昨日的平均字段空串率）｜/上月同天至昨日的平均字段空串率。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。
空串检测
空串数，固定值
完整性校验
字段
0
针对字段空串数的数量校验，可配置字段空串数>/>=/</<=/=/!=某个数值。
空串检测
空串数，1天波动检测
完整性校验
字段
0
针对字段空串数的1天波动率校验，计算方法为｜（今日字段空串数-昨日字段空串数）｜/昨日字段空串数。可配置1天波动率>/>=/</<=/=/!=某个百分比。
空串检测
空串数，7天波动检测
完整性校验
字段
0
针对字段空串数的7天波动率校验，计算方法为｜（今日字段空串数-7日前字段空串数）｜/7日前字段空串数。可配置7天波动率>/>=/</<=/=/!=某个百分比。
空串检测
空串数，月度波动检测
完整性校验
字段
0
针对字段空串数的月度波动率校验，计算方法为｜（今日字段空串数-上月同天字段空串数）｜/上月同天字段空串数。可配置月度波动率>/>=/</<=/=/!=某个百分比。
空串检测
空串数，7天平均值波动检测
完整性校验
字段
0
针对字段空串数的7天平均值波动率校验，计算方法为｜（今日字段空串数-近7日平均字段空串数）｜/近7日平均字段空串数。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。
空串检测
空串数，月度平均值波动检测
完整性校验
字段
0
针对字段空串数的月度平均值波动率校验，计算方法为｜（今日字段空串数-上月同天至昨日的平均字段空串数）｜/上月同天至昨日的平均字段空串数。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。
数值取值范围
数值-取值范围
有效性校验
字段
1
针对字段值的取值范围校验，可配置取值范围区间，支持>/>=/</<=/=/!=判断符。
数值枚举个数
数值-枚举个数，固定值
有效性校验
字段
2
枚举个数表示，校验字段值中存在的枚举数量，用count(distinct{fieldName})计算。可配置字段枚举个数>/>=/</<=/=/!=某个数值。
数值枚举个数
数值-枚举个数，1天波动检测
有效性校验
字段
0
枚举个数表示，校验字段值中存在的枚举数量，用count(distinct{fieldName})计算。针对枚举个数的1天波动率校验，计算方法为｜（今日字段值枚举个数-昨日字段值枚举个数）｜/昨日字段值枚举个数。可配置1天波动率>/>=/</<=/=/!=某个百分比。
数值枚举个数
数值-枚举个数，7天波动检测
有效性校验
字段
0
枚举个数表示，校验字段值中存在的枚举数量，用count(distinct{fieldName})计算。针对字段求枚举个数后的7天波动率校验，计算方法为｜（今日字段值枚举个数-7日前字段值枚举个数）｜/7日前字段值枚举个数。可配置7天波动率>/>=/</<=/=/!=某个百分比。
数值枚举个数
数值-枚举个数，月度波动检测
有效性校验
字段
0
枚举个数表示，校验字段值中存在的枚举数量，用count(distinct{fieldName})计算。针对字段求枚举个数后的月度波动率校验，计算方法为｜（今日字段值枚举个数-上月同天字段值枚举个数）｜/上月同天字段值枚举个数。可配置月度波动率>/>=/</<=/=/!=某个百分比。
数值枚举个数
数值-枚举个数，7天平均值波动检测
有效性校验
字段
0
枚举个数表示，校验字段值中存在的枚举数量，用count(distinct{fieldName})计算。针对字段求枚举个数后的7天平均值波动率校验，计算方法为｜（今日字段值枚举个数-近7日平均字段值枚举个数）｜/近7日平均字段值枚举个数。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。
数值枚举个数
数值-枚举个数，月度平均值波动检测
有效性校验
字段
0
枚举个数表示，校验字段值中存在的枚举数量，用count(distinct{fieldName})计算。针对字段求枚举个数后的月度平均值波动率校验，计算方法为｜（今日字段值枚举个数-上月同天至昨日的平均字段值枚举个数）｜/上月同天至昨日的平均字段值枚举个数。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。
格式校验
格式-身份证号，固定值
有效性校验
字段
0
校验字段值符合身份证号格式的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。
格式校验
格式-身份证号，占比
有效性校验
字段
0
校验字段值符合身份证号格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。
格式校验
格式-邮箱，固定值
有效性校验
字段
0
校验字段值符合邮箱格式的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。
格式校验
格式-邮箱，占比
有效性校验
字段
0
校验字段值符合邮箱格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。
格式校验
格式-手机号，固定值
有效性校验
字段
0
校验字段值符合手机号格式的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。
格式校验
格式-手机号，占比
有效性校验
字段
0
校验字段值符合手机号格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。
字段长度
字符串长度，固定值
有效性校验
字段
1
校验字符串长度范围，可配置长度>/>=/</<=/=/!=某个数值。
数据精度
数据精度，固定值
有效性校验
字段
0
校验字段值中数据精度，可配置小数点前最大位数、小数点后最大位数。
枚举值
枚举值
有效性校验
字段
1
校验字段值中的枚举范围，支持配置多个枚举值
重复值检测
重复数，固定值
唯一性校验
字段
1
重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的数量校验，可配置字段重复数>/>=/</<=/=/!=某个数值。
重复值检测
重复数，1天波动检测
唯一性校验
字段
0
重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的1天波动率校验，计算方法为｜（今日字段重复数-昨日字段重复数）｜/昨日字段重复数。可配置1天波动率>/>=/</<=/=/!=某个百分比。
重复值检测
重复数，7天波动检测
唯一性校验
字段
0
重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的7天波动率校验，计算方法为｜（今日字段重复数-7日前字段重复数）｜/7日前字段重复数。可配置7天波动率>/>=/</<=/=/!=某个百分比。
重复值检测
重复数，月度波动检测
唯一性校验
字段
0
重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的月度波动率校验，计算方法为｜（今日字段重复数-上月同天字段重复数）｜/上月同天字段重复数。可配置月度波动率>/>=/</<=/=/!=某个百分比。
重复值检测
重复数，7天平均值波动检测
唯一性校验
字段
0
重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的7天平均值波动率校验，计算方法为｜（今日字段重复数-近7日平均字段重复数）｜/近7日平均字段重复数。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。
重复值检测
重复数，月度平均值波动检测
唯一性校验
字段
0
重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的月度平均值波动率校验，计算方法为｜（今日字段重复数-上月同天至昨日的平均字段重复数）｜/上月同天至昨日的平均字段重复数。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。
重复值检测
重复率，固定值
唯一性校验
字段
0
重复率指重复值个数/总行数。针对字段重复率的数量校验，可配置字段重复率>/>=/</<=/=/!=某个数值。
重复值检测
重复率，1天波动检测
唯一性校验
字段
0
重复率指重复值个数/总行数。针对字段重复率的1天波动率校验，计算方法为｜（今日字段重复率-昨日字段重复率）｜/昨日字段重复率。可配置1天波动率>/>=/</<=/=/!=某个百分比。
重复值检测
重复率，7天波动检测
唯一性校验
字段
0
重复率指重复值个数/总行数。针对字段重复率的7天波动率校验，计算方法为｜（今日字段重复率-7日前字段重复率）｜/7日前字段重复率。可配置7天波动率>/>=/</<=/=/!=某个百分比。
重复值检测
重复率，月度波动检测
唯一性校验
字段
0
重复率指重复值个数/总行数。针对字段重复率的月度波动率校验，计算方法为｜（今日字段重复率-上月同天字段重复率）｜/上月同天字段重复率。可配置月度波动率>/>=/</<=/=/!=某个百分比。
重复值检测
重复率，7天平均值波动检测
唯一性校验
字段
0
重复率指重复值个数/总行数。针对字段重复率的7天平均值波动率校验，计算方法为｜（今日字段重复率-近7日平均字段重复率）｜/近7日平均字段重复率。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。
重复值检测
重复率，月度平均值波动检测
唯一性校验
字段
0
重复率指重复值个数/总行数。针对字段重复率的月度平均值波动率校验，计算方法为｜（今日字段重复率-上月同天至昨日的平均字段重复率）｜/上月同天至昨日的平均字段重复率。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。
多表唯一性检测
多表唯一性判断
唯一性校验
多表
1
校验多张表的多个字段的唯一性判断。
格式校验
格式-日期格式date，固定值
有效性校验
字段
0
校验字段值符合日期格式date格式的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。
格式校验
格式-日期格式date，占比
有效性校验
字段
0
校验字段值符合日期格式date格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。
格式校验
格式-日期格式datetime，固定值
有效性校验
字段
0
校验字段值符合日期格式datetime格式的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。
格式校验
格式-日期格式datetime，占比
有效性校验
字段
0
校验字段值符合日期格式datetime格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。
格式校验
格式-自定义正则，固定值
有效性校验
字段
8
校验字段值符合xxx(规则名称)的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。
格式校验
格式-自定义正则，占比
有效性校验
字段
0
校验字段值符合xxx(规则名称)的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。
异常值检测
异常值检测，IQR离群点数量
统计性校验
字段
0
针对字段值存在离群点的数量的计算，可配置离群点数>/>=/</<=/=/!=某个数值。
异常值检测
异常值检测，IQR离群点占比
统计性校验
字段
0
针对字段值存在离群点的数量的占比计算，可配置离群点数占比>/>=/</<=/=/!=某个数值。
异常值检测
异常值检测，Z- score置信区间
统计性校验
字段
0
针对字段值置信区间的计算，可配置置信区间>/>=/</<=/=/!=某个数值。
字段值校验
字段取值校验
完整性校验
字段
1
针对字段值取值的校验，支持配置表内多个字段的取值校验，可配置字段值>/>=/</<=/=/!=/包含/不包含逻辑，若配置了多个字段支持设置字段之间的且或关系
多表行数比对
多表行数比对
完整性校验
多表
0
比较多个数据表之间的表行数差异
多表数据内容对比
多表数据内容对比
完整性校验
多表
0
比较多个数据表之间的字段取值校验，可根据选择的主键按照多表之间主键相同的行数据进行对比判断
数据变化趋势
单调递增、单调递减校验
合理性校验
字段
0
比较字段内数据排序后是否符合单调递增/单调递减的逻辑
及时性校验
多字段时间差校验
时效性校验
字段
0
比较两个时间类型字段之间的时间差是否符合要求，支持校验多个字段组时间差
周期性校验
单字段时间差校验
时效性校验
字段
0
比较时间字段内相邻两行数据的时间差是否符合要求
多表数据一致性比对
多表数据一致性比对
一致性校验
多表
0
比较多个数据表之间的数据是否一致
取值范围&枚举范围
取值范围和枚举范围的联合校验
有效性校验
字段
3
校验字段值取值范围和枚举范围是否符合要求，支持配置规则且或关系
字段值计算对比
单表字段值的计算对比
合理性校验
字段
0
比较字段值的计算逻辑是否符合要求，支持将计算结果与字段值进行对比或计算结果值的值域判断
key范围校验
对数据中包含的key范围校验
完整性校验
字段
37
校验json类型的字段中key名是否完整，对key的范围进行校验
格式-json格式校验
格式-json格式校验
有效性校验
字段
13
校验json类型的字段中key对应的value值是否符合规范要求
多表字段值对比
多表字段值的计算对比
合理性校验
多表
1
比较多表关联后字段值的计算逻辑是否符合要求，支持将计算结果进行对比或计算结果值的值域判断"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6] [cursor=pointer]:
          - img [ref=e8]
          - generic [ref=e10]:
            - img "logo" [ref=e12]
            - generic [ref=e14]: DataAssets
        - menu [ref=e17]:
          - menuitem "资产盘点" [ref=e18] [cursor=pointer]:
            - link "资产盘点" [ref=e20]:
              - /url: "#/assetsStatistics"
          - menuitem "元数据" [ref=e21] [cursor=pointer]:
            - link "元数据" [ref=e23]:
              - /url: "#/metaDataCenter"
          - menuitem "数据标准" [ref=e24] [cursor=pointer]:
            - link "数据标准" [ref=e26]:
              - /url: "#/standardStatistic"
          - menuitem "数据模型" [ref=e27] [cursor=pointer]:
            - link "数据模型" [ref=e29]:
              - /url: "#/builtSpecificationTable"
          - menuitem "数据质量" [ref=e30] [cursor=pointer]:
            - link "数据质量" [ref=e32]:
              - /url: "#/dq/overview"
          - menuitem "数据安全" [ref=e33] [cursor=pointer]:
            - link "数据安全" [ref=e35]:
              - /url: "#/dataAuth/permissionAssign"
          - menuitem "平台管理" [ref=e36] [cursor=pointer]:
            - link "平台管理" [ref=e38]:
              - /url: "#/dataSourceManage"
          - menuitem [disabled]:
            - img:
              - img
      - list [ref=e40]:
        - button [ref=e41] [cursor=pointer]:
          - img [ref=e43]
        - generic "帮助文档" [ref=e51] [cursor=pointer]:
          - link "question-circle" [ref=e52]:
            - /url: /helpSite/docs/assets/root/summary/
            - img "question-circle" [ref=e53]:
              - img [ref=e54]
        - link "message" [ref=e56] [cursor=pointer]:
          - /url: http://shuzhan63-test-ltqc.k8s.dtstack.cn/portal/#/message?app=dataAssets
          - img "message" [ref=e58]:
            - img [ref=e59]
        - img "setting" [ref=e62] [cursor=pointer]:
          - img [ref=e63]
        - generic "admin@dtstack.com" [ref=e66] [cursor=pointer]
    - generic [ref=e68]:
      - complementary [ref=e69]:
        - generic [ref=e70]:
          - generic [ref=e72] [cursor=pointer]:
            - generic [ref=e73]:
              - combobox [ref=e75]
              - generic "pw_test" [ref=e76]
            - generic:
              - img:
                - img
          - menu [ref=e78]:
            - menuitem "总览" [ref=e79] [cursor=pointer]:
              - link "总览" [ref=e81]:
                - /url: "#/dq/overview"
                - generic [ref=e82]:
                  - img [ref=e83]
                  - generic [ref=e86]: 总览
            - menuitem "规则库配置" [ref=e87] [cursor=pointer]:
              - link "规则库配置" [ref=e89]:
                - /url: "#/dq/ruleBase"
                - generic [ref=e90]:
                  - img [ref=e91]
                  - generic [ref=e94]: 规则库配置
            - menuitem "规则集管理" [ref=e95] [cursor=pointer]:
              - link "规则集管理" [ref=e97]:
                - /url: "#/dq/ruleSet"
                - generic [ref=e98]:
                  - img [ref=e99]
                  - generic [ref=e102]: 规则集管理
            - menuitem "规则任务管理" [ref=e103] [cursor=pointer]:
              - link "规则任务管理" [ref=e105]:
                - /url: "#/dq/rule"
                - generic [ref=e106]:
                  - img [ref=e107]
                  - generic [ref=e110]: 规则任务管理
            - menuitem "校验结果查询" [ref=e111] [cursor=pointer]:
              - link "校验结果查询" [ref=e113]:
                - /url: "#/dq/taskQuery"
                - generic [ref=e114]:
                  - img [ref=e115]
                  - generic [ref=e118]: 校验结果查询
            - menuitem "数据质量报告" [ref=e119] [cursor=pointer]:
              - link "数据质量报告" [ref=e121]:
                - /url: "#/dq/qualityReport"
                - generic [ref=e122]:
                  - img [ref=e123]
                  - generic [ref=e126]: 数据质量报告
            - menuitem "通用配置" [ref=e127] [cursor=pointer]:
              - generic [ref=e129]:
                - img [ref=e130]
                - generic [ref=e133]: 通用配置
            - menuitem "项目管理" [ref=e134] [cursor=pointer]:
              - generic [ref=e136]:
                - img [ref=e137]
                - generic [ref=e140]: 项目管理
      - main [ref=e142]:
        - generic [ref=e144]:
          - tablist [ref=e145]:
            - generic [ref=e147]:
              - tab "内置规则" [selected] [ref=e149] [cursor=pointer]
              - tab "自定义正则" [ref=e151] [cursor=pointer]
              - tab "自定义sql模版" [ref=e153] [cursor=pointer]
          - tabpanel "内置规则" [ref=e156]:
            - generic [ref=e157]:
              - generic [ref=e159]:
                - generic [ref=e161]:
                  - textbox "请输入规则名称进行搜索" [ref=e163]
                  - button "search" [ref=e166] [cursor=pointer]:
                    - img "search" [ref=e167]:
                      - img [ref=e168]
                - button "导出规则库" [ref=e170] [cursor=pointer]:
                  - generic [ref=e171]: 导出规则库
              - generic [ref=e175]:
                - generic [ref=e176]:
                  - table [ref=e178]:
                    - rowgroup [ref=e187]:
                      - row "规则名称 规则解释 规则分类 filter 关联范围 filter 关联规则数 规则状态 filter 规则描述" [ref=e188]:
                        - columnheader "规则名称" [ref=e189]
                        - columnheader "规则解释" [ref=e190]
                        - columnheader "规则分类 filter" [ref=e191]:
                          - generic [ref=e192]:
                            - generic [ref=e193]: 规则分类
                            - button "filter" [ref=e194] [cursor=pointer]:
                              - img "filter" [ref=e195]:
                                - img [ref=e196]
                        - columnheader "关联范围 filter" [ref=e198]:
                          - generic [ref=e199]:
                            - generic [ref=e200]: 关联范围
                            - button "filter" [ref=e201] [cursor=pointer]:
                              - img "filter" [ref=e202]:
                                - img [ref=e203]
                        - columnheader "关联规则数" [ref=e205]
                        - columnheader "规则状态 filter" [ref=e206]:
                          - generic [ref=e207]:
                            - generic [ref=e208]: 规则状态
                            - button "filter" [ref=e209] [cursor=pointer]:
                              - img "filter" [ref=e210]:
                                - img [ref=e211]
                        - columnheader "规则描述" [ref=e213]
                  - table [ref=e215]:
                    - rowgroup [ref=e223]:
                      - row "多表字段值对比 多表字段值的计算对比 合理性校验 多表 1 比较多表关联后字段值的计算逻辑是否符合要求，支持将计算结果进行对比或计算结果值的值域判断" [ref=e224]:
                        - cell "多表字段值对比" [ref=e225]:
                          - generic [ref=e226]: 多表字段值对比
                        - cell "多表字段值的计算对比" [ref=e227]:
                          - generic [ref=e228]: 多表字段值的计算对比
                        - cell "合理性校验" [ref=e229]
                        - cell "多表" [ref=e230]
                        - cell "1" [ref=e231]
                        - cell [ref=e232]:
                          - switch [checked] [disabled] [ref=e233]
                        - cell "比较多表关联后字段值的计算逻辑是否符合要求，支持将计算结果进行对比或计算结果值的值域判断" [ref=e235]:
                          - generic [ref=e236]: 比较多表关联后字段值的计算逻辑是否符合要求，支持将计算结果进行对比或计算结果值的值域判断
                      - row "格式-json格式校验 格式-json格式校验 有效性校验 字段 13 校验json类型的字段中key对应的value值是否符合规范要求" [ref=e237]:
                        - cell "格式-json格式校验" [ref=e238]:
                          - generic [ref=e239]: 格式-json格式校验
                        - cell "格式-json格式校验" [ref=e240]:
                          - generic [ref=e241]: 格式-json格式校验
                        - cell "有效性校验" [ref=e242]
                        - cell "字段" [ref=e243]
                        - cell "13" [ref=e244]
                        - cell [ref=e245]:
                          - switch [checked] [disabled] [ref=e246]
                        - cell "校验json类型的字段中key对应的value值是否符合规范要求" [ref=e248]:
                          - generic [ref=e249]: 校验json类型的字段中key对应的value值是否符合规范要求
                      - row "key范围校验 对数据中包含的key范围校验 完整性校验 字段 37 校验json类型的字段中key名是否完整，对key的范围进行校验" [ref=e250]:
                        - cell "key范围校验" [ref=e251]:
                          - generic [ref=e252]: key范围校验
                        - cell "对数据中包含的key范围校验" [ref=e253]:
                          - generic [ref=e254]: 对数据中包含的key范围校验
                        - cell "完整性校验" [ref=e255]
                        - cell "字段" [ref=e256]
                        - cell "37" [ref=e257]
                        - cell [ref=e258]:
                          - switch [checked] [disabled] [ref=e259]
                        - cell "校验json类型的字段中key名是否完整，对key的范围进行校验" [ref=e261]:
                          - generic [ref=e262]: 校验json类型的字段中key名是否完整，对key的范围进行校验
                      - row "字段值计算对比 单表字段值的计算对比 合理性校验 字段 0 比较字段值的计算逻辑是否符合要求，支持将计算结果与字段值进行对比或计算结果值的值域判断" [ref=e263]:
                        - cell "字段值计算对比" [ref=e264]:
                          - generic [ref=e265]: 字段值计算对比
                        - cell "单表字段值的计算对比" [ref=e266]:
                          - generic [ref=e267]: 单表字段值的计算对比
                        - cell "合理性校验" [ref=e268]
                        - cell "字段" [ref=e269]
                        - cell "0" [ref=e270]
                        - cell [ref=e271]:
                          - switch [checked] [ref=e272] [cursor=pointer]
                        - cell "比较字段值的计算逻辑是否符合要求，支持将计算结果与字段值进行对比或计算结果值的值域判断" [ref=e274]:
                          - generic [ref=e275]: 比较字段值的计算逻辑是否符合要求，支持将计算结果与字段值进行对比或计算结果值的值域判断
                      - row "取值范围&枚举范围 取值范围和枚举范围的联合校验 有效性校验 字段 3 校验字段值取值范围和枚举范围是否符合要求，支持配置规则且或关系" [ref=e276]:
                        - cell "取值范围&枚举范围" [ref=e277]:
                          - generic [ref=e278]: 取值范围&枚举范围
                        - cell "取值范围和枚举范围的联合校验" [ref=e279]:
                          - generic [ref=e280]: 取值范围和枚举范围的联合校验
                        - cell "有效性校验" [ref=e281]
                        - cell "字段" [ref=e282]
                        - cell "3" [ref=e283]
                        - cell [ref=e284]:
                          - switch [checked] [disabled] [ref=e285]
                        - cell "校验字段值取值范围和枚举范围是否符合要求，支持配置规则且或关系" [ref=e287]:
                          - generic [ref=e288]: 校验字段值取值范围和枚举范围是否符合要求，支持配置规则且或关系
                      - row "多表数据一致性比对 多表数据一致性比对 一致性校验 多表 0 比较多个数据表之间的数据是否一致" [ref=e289]:
                        - cell "多表数据一致性比对" [ref=e290]:
                          - generic [ref=e291]: 多表数据一致性比对
                        - cell "多表数据一致性比对" [ref=e292]:
                          - generic [ref=e293]: 多表数据一致性比对
                        - cell "一致性校验" [ref=e294]
                        - cell "多表" [ref=e295]
                        - cell "0" [ref=e296]
                        - cell [ref=e297]:
                          - switch [checked] [ref=e298] [cursor=pointer]
                        - cell "比较多个数据表之间的数据是否一致" [ref=e300]:
                          - generic [ref=e301]: 比较多个数据表之间的数据是否一致
                      - row "周期性校验 单字段时间差校验 时效性校验 字段 0 比较时间字段内相邻两行数据的时间差是否符合要求" [ref=e302]:
                        - cell "周期性校验" [ref=e303]:
                          - generic [ref=e304]: 周期性校验
                        - cell "单字段时间差校验" [ref=e305]:
                          - generic [ref=e306]: 单字段时间差校验
                        - cell "时效性校验" [ref=e307]
                        - cell "字段" [ref=e308]
                        - cell "0" [ref=e309]
                        - cell [ref=e310]:
                          - switch [checked] [ref=e311] [cursor=pointer]
                        - cell "比较时间字段内相邻两行数据的时间差是否符合要求" [ref=e313]:
                          - generic [ref=e314]: 比较时间字段内相邻两行数据的时间差是否符合要求
                      - row "及时性校验 多字段时间差校验 时效性校验 字段 0 比较两个时间类型字段之间的时间差是否符合要求，支持校验多个字段组时间差" [ref=e315]:
                        - cell "及时性校验" [ref=e316]:
                          - generic [ref=e317]: 及时性校验
                        - cell "多字段时间差校验" [ref=e318]:
                          - generic [ref=e319]: 多字段时间差校验
                        - cell "时效性校验" [ref=e320]
                        - cell "字段" [ref=e321]
                        - cell "0" [ref=e322]
                        - cell [ref=e323]:
                          - switch [checked] [ref=e324] [cursor=pointer]
                        - cell "比较两个时间类型字段之间的时间差是否符合要求，支持校验多个字段组时间差" [ref=e326]:
                          - generic [ref=e327]: 比较两个时间类型字段之间的时间差是否符合要求，支持校验多个字段组时间差
                      - row "数据变化趋势 单调递增、单调递减校验 合理性校验 字段 0 比较字段内数据排序后是否符合单调递增/单调递减的逻辑" [ref=e328]:
                        - cell "数据变化趋势" [ref=e329]:
                          - generic [ref=e330]: 数据变化趋势
                        - cell "单调递增、单调递减校验" [ref=e331]:
                          - generic [ref=e332]: 单调递增、单调递减校验
                        - cell "合理性校验" [ref=e333]
                        - cell "字段" [ref=e334]
                        - cell "0" [ref=e335]
                        - cell [ref=e336]:
                          - switch [checked] [ref=e337] [cursor=pointer]
                        - cell "比较字段内数据排序后是否符合单调递增/单调递减的逻辑" [ref=e339]:
                          - generic [ref=e340]: 比较字段内数据排序后是否符合单调递增/单调递减的逻辑
                      - row "多表数据内容对比 多表数据内容对比 完整性校验 多表 0 比较多个数据表之间的字段取值校验，可根据选择的主键按照多表之间主键相同的行数据进行对比判断" [ref=e341]:
                        - cell "多表数据内容对比" [ref=e342]:
                          - generic [ref=e343]: 多表数据内容对比
                        - cell "多表数据内容对比" [ref=e344]:
                          - generic [ref=e345]: 多表数据内容对比
                        - cell "完整性校验" [ref=e346]
                        - cell "多表" [ref=e347]
                        - cell "0" [ref=e348]
                        - cell [ref=e349]:
                          - switch [checked] [ref=e350] [cursor=pointer]
                        - cell "比较多个数据表之间的字段取值校验，可根据选择的主键按照多表之间主键相同的行数据进行对比判断" [ref=e352]:
                          - generic [ref=e353]: 比较多个数据表之间的字段取值校验，可根据选择的主键按照多表之间主键相同的行数据进行对比判断
                      - row "多表行数比对 多表行数比对 完整性校验 多表 0 比较多个数据表之间的表行数差异" [ref=e354]:
                        - cell "多表行数比对" [ref=e355]:
                          - generic [ref=e356]: 多表行数比对
                        - cell "多表行数比对" [ref=e357]:
                          - generic [ref=e358]: 多表行数比对
                        - cell "完整性校验" [ref=e359]
                        - cell "多表" [ref=e360]
                        - cell "0" [ref=e361]
                        - cell [ref=e362]:
                          - switch [checked] [ref=e363] [cursor=pointer]
                        - cell "比较多个数据表之间的表行数差异" [ref=e365]:
                          - generic [ref=e366]: 比较多个数据表之间的表行数差异
                      - row "字段值校验 字段取值校验 完整性校验 字段 1 针对字段值取值的校验，支持配置表内多个字段的取值校验，可配置字段值>/>=/</<=/=/!=/包含/不包含逻辑，若配置了多个字段支持设置字段之间的且或关系" [ref=e367]:
                        - cell "字段值校验" [ref=e368]:
                          - generic [ref=e369]: 字段值校验
                        - cell "字段取值校验" [ref=e370]:
                          - generic [ref=e371]: 字段取值校验
                        - cell "完整性校验" [ref=e372]
                        - cell "字段" [ref=e373]
                        - cell "1" [ref=e374]
                        - cell [ref=e375]:
                          - switch [checked] [disabled] [ref=e376]
                        - cell "针对字段值取值的校验，支持配置表内多个字段的取值校验，可配置字段值>/>=/</<=/=/!=/包含/不包含逻辑，若配置了多个字段支持设置字段之间的且或关系" [ref=e378]:
                          - generic [ref=e379]: 针对字段值取值的校验，支持配置表内多个字段的取值校验，可配置字段值>/>=/</<=/=/!=/包含/不包含逻辑，若配置了多个字段支持设置字段之间的且或关系
                      - row "异常值检测 异常值检测，Z- score置信区间 统计性校验 字段 0 针对字段值置信区间的计算，可配置置信区间>/>=/</<=/=/!=某个数值。" [ref=e380]:
                        - cell "异常值检测" [ref=e381]:
                          - generic [ref=e382]: 异常值检测
                        - cell "异常值检测，Z- score置信区间" [ref=e383]:
                          - generic [ref=e384]: 异常值检测，Z- score置信区间
                        - cell "统计性校验" [ref=e385]
                        - cell "字段" [ref=e386]
                        - cell "0" [ref=e387]
                        - cell [ref=e388]:
                          - switch [checked] [ref=e389] [cursor=pointer]
                        - cell "针对字段值置信区间的计算，可配置置信区间>/>=/</<=/=/!=某个数值。" [ref=e391]:
                          - generic [ref=e392]: 针对字段值置信区间的计算，可配置置信区间>/>=/</<=/=/!=某个数值。
                      - row "异常值检测 异常值检测，IQR离群点占比 统计性校验 字段 0 针对字段值存在离群点的数量的占比计算，可配置离群点数占比>/>=/</<=/=/!=某个数值。" [ref=e393]:
                        - cell "异常值检测" [ref=e394]:
                          - generic [ref=e395]: 异常值检测
                        - cell "异常值检测，IQR离群点占比" [ref=e396]:
                          - generic [ref=e397]: 异常值检测，IQR离群点占比
                        - cell "统计性校验" [ref=e398]
                        - cell "字段" [ref=e399]
                        - cell "0" [ref=e400]
                        - cell [ref=e401]:
                          - switch [checked] [ref=e402] [cursor=pointer]
                        - cell "针对字段值存在离群点的数量的占比计算，可配置离群点数占比>/>=/</<=/=/!=某个数值。" [ref=e404]:
                          - generic [ref=e405]: 针对字段值存在离群点的数量的占比计算，可配置离群点数占比>/>=/</<=/=/!=某个数值。
                      - row "异常值检测 异常值检测，IQR离群点数量 统计性校验 字段 0 针对字段值存在离群点的数量的计算，可配置离群点数>/>=/</<=/=/!=某个数值。" [ref=e406]:
                        - cell "异常值检测" [ref=e407]:
                          - generic [ref=e408]: 异常值检测
                        - cell "异常值检测，IQR离群点数量" [ref=e409]:
                          - generic [ref=e410]: 异常值检测，IQR离群点数量
                        - cell "统计性校验" [ref=e411]
                        - cell "字段" [ref=e412]
                        - cell "0" [ref=e413]
                        - cell [ref=e414]:
                          - switch [checked] [ref=e415] [cursor=pointer]
                        - cell "针对字段值存在离群点的数量的计算，可配置离群点数>/>=/</<=/=/!=某个数值。" [ref=e417]:
                          - generic [ref=e418]: 针对字段值存在离群点的数量的计算，可配置离群点数>/>=/</<=/=/!=某个数值。
                      - row "格式校验 格式-自定义正则，占比 有效性校验 字段 0 校验字段值符合xxx(规则名称)的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。" [ref=e419]:
                        - cell "格式校验" [ref=e420]:
                          - generic [ref=e421]: 格式校验
                        - cell "格式-自定义正则，占比" [ref=e422]:
                          - generic [ref=e423]: 格式-自定义正则，占比
                        - cell "有效性校验" [ref=e424]
                        - cell "字段" [ref=e425]
                        - cell "0" [ref=e426]
                        - cell [ref=e427]:
                          - switch [checked] [ref=e428] [cursor=pointer]
                        - cell "校验字段值符合xxx(规则名称)的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。" [ref=e430]:
                          - generic [ref=e431]: 校验字段值符合xxx(规则名称)的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。
                      - row "格式校验 格式-自定义正则，固定值 有效性校验 字段 8 校验字段值符合xxx(规则名称)的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。" [ref=e432]:
                        - cell "格式校验" [ref=e433]:
                          - generic [ref=e434]: 格式校验
                        - cell "格式-自定义正则，固定值" [ref=e435]:
                          - generic [ref=e436]: 格式-自定义正则，固定值
                        - cell "有效性校验" [ref=e437]
                        - cell "字段" [ref=e438]
                        - cell "8" [ref=e439]
                        - cell [ref=e440]:
                          - switch [checked] [disabled] [ref=e441]
                        - cell "校验字段值符合xxx(规则名称)的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。" [ref=e443]:
                          - generic [ref=e444]: 校验字段值符合xxx(规则名称)的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。
                      - row "格式校验 格式-日期格式datetime，占比 有效性校验 字段 0 校验字段值符合日期格式datetime格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。" [ref=e445]:
                        - cell "格式校验" [ref=e446]:
                          - generic [ref=e447]: 格式校验
                        - cell "格式-日期格式datetime，占比" [ref=e448]:
                          - generic [ref=e449]: 格式-日期格式datetime，占比
                        - cell "有效性校验" [ref=e450]
                        - cell "字段" [ref=e451]
                        - cell "0" [ref=e452]
                        - cell [ref=e453]:
                          - switch [checked] [ref=e454] [cursor=pointer]
                        - cell "校验字段值符合日期格式datetime格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。" [ref=e456]:
                          - generic [ref=e457]: 校验字段值符合日期格式datetime格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。
                      - row "格式校验 格式-日期格式datetime，固定值 有效性校验 字段 0 校验字段值符合日期格式datetime格式的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。" [ref=e458]:
                        - cell "格式校验" [ref=e459]:
                          - generic [ref=e460]: 格式校验
                        - cell "格式-日期格式datetime，固定值" [ref=e461]:
                          - generic [ref=e462]: 格式-日期格式datetime，固定值
                        - cell "有效性校验" [ref=e463]
                        - cell "字段" [ref=e464]
                        - cell "0" [ref=e465]
                        - cell [ref=e466]:
                          - switch [checked] [ref=e467] [cursor=pointer]
                        - cell "校验字段值符合日期格式datetime格式的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。" [ref=e469]:
                          - generic [ref=e470]: 校验字段值符合日期格式datetime格式的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。
                      - row "格式校验 格式-日期格式date，占比 有效性校验 字段 0 校验字段值符合日期格式date格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。" [ref=e471]:
                        - cell "格式校验" [ref=e472]:
                          - generic [ref=e473]: 格式校验
                        - cell "格式-日期格式date，占比" [ref=e474]:
                          - generic [ref=e475]: 格式-日期格式date，占比
                        - cell "有效性校验" [ref=e476]
                        - cell "字段" [ref=e477]
                        - cell "0" [ref=e478]
                        - cell [ref=e479]:
                          - switch [checked] [ref=e480] [cursor=pointer]
                        - cell "校验字段值符合日期格式date格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。" [ref=e482]:
                          - generic [ref=e483]: 校验字段值符合日期格式date格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。
                - list [ref=e485]:
                  - listitem [ref=e486]: 共 80 条数据，每页显示 20 条
                  - listitem "上一页" [ref=e487]:
                    - button "left" [disabled] [ref=e488]:
                      - img "left" [ref=e489]:
                        - img [ref=e490]
                  - listitem "1" [ref=e492] [cursor=pointer]:
                    - generic [ref=e493]: "1"
                  - listitem "2" [ref=e494] [cursor=pointer]:
                    - generic [ref=e495]: "2"
                  - listitem "3" [ref=e496] [cursor=pointer]:
                    - generic [ref=e497]: "3"
                  - listitem "4" [ref=e498] [cursor=pointer]:
                    - generic [ref=e499]: "4"
                  - listitem "下一页" [ref=e500] [cursor=pointer]:
                    - button "right" [ref=e501]:
                      - img "right" [ref=e502]:
                        - img [ref=e503]
                  - listitem [ref=e505]:
                    - generic "页码" [ref=e506] [cursor=pointer]:
                      - generic [ref=e507]:
                        - combobox "页码" [ref=e509]
                        - generic "20 条/页" [ref=e510]
  - generic [ref=e513]:
    - img "check-circle" [ref=e514]:
      - img [ref=e515]
    - text: 下载成功
```

# Test source

```ts
  5423 |   }
  5424 | }
  5425 | 
  5426 | export async function expectDataQualityRuleBaseBuiltInRulesShell(
  5427 |   page: Page,
  5428 |   sourceRef: string,
  5429 | ): Promise<void> {
  5430 |   const initialResponse = waitForDqJson<DqRuleBaseTemplatePage>(
  5431 |     page,
  5432 |     "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  5433 |   );
  5434 |   await gotoDataQualityPage(page, "/dq/ruleBase");
  5435 |   const initialPage = expectDqSuccess(await initialResponse, `${sourceRef}: 内置规则列表应请求成功`);
  5436 | 
  5437 |   const body = page.locator("body");
  5438 |   for (const label of ["规则库配置", "内置规则", "自定义正则", "自定义sql模版", "导出规则库"]) {
  5439 |     await expect(body, `${sourceRef}: 规则库配置应展示「${label}」`).toContainText(label, {
  5440 |       timeout: 30000,
  5441 |     });
  5442 |   }
  5443 | 
  5444 |   for (const header of ["规则名称", "规则解释", "规则分类", "关联范围", "关联规则数", "规则状态", "规则描述"]) {
  5445 |     await expect(body, `${sourceRef}: 内置规则列表应展示列「${header}」`).toContainText(header, {
  5446 |       timeout: 30000,
  5447 |     });
  5448 |   }
  5449 | 
  5450 |   const initialRecords = expectRuleBaseRecords(initialPage, `${sourceRef}: 内置规则列表应返回记录`);
  5451 |   expect(Number(initialPage.total), `${sourceRef}: 内置规则总数应大于当前页记录数`).toBeGreaterThanOrEqual(
  5452 |     initialRecords.length,
  5453 |   );
  5454 |   assertRuleBaseNewBuiltInRules(sourceRef, initialRecords);
  5455 | 
  5456 |   const searchKeyword = "key范围校验";
  5457 |   const searchResponse = waitForDqJson<DqRuleBaseTemplatePage>(
  5458 |     page,
  5459 |     "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  5460 |   );
  5461 |   await page.locator("input[placeholder='请输入规则名称进行搜索']:visible").first().fill(searchKeyword);
  5462 |   await page.keyboard.press("Enter");
  5463 |   const searchRecords = expectRuleBaseRecords(
  5464 |     expectDqSuccess(await searchResponse, `${sourceRef}: 规则名称搜索应请求成功`),
  5465 |     `${sourceRef}: 规则名称搜索应返回记录`,
  5466 |   );
  5467 |   expect(
  5468 |     searchRecords.every((record) => String(record.functionName ?? "").includes(searchKeyword)),
  5469 |     `${sourceRef}: 搜索结果应仅包含命中规则名称`,
  5470 |   ).toBe(true);
  5471 |   await expect(body, `${sourceRef}: 搜索后列表应展示「${searchKeyword}」`).toContainText(searchKeyword, {
  5472 |     timeout: 30000,
  5473 |   });
  5474 | 
  5475 |   await gotoRuleBaseWithInitialList(page, sourceRef);
  5476 |   await assertRuleBaseCategoryFilter(page, sourceRef);
  5477 | 
  5478 |   await gotoRuleBaseWithInitialList(page, sourceRef);
  5479 |   await assertRuleBaseRelationRangeFilter(page, sourceRef);
  5480 | }
  5481 | 
  5482 | export async function expectDataQualityRuleBaseBuiltInExportContract(
  5483 |   page: Page,
  5484 |   sourceRef: string,
  5485 | ): Promise<void> {
  5486 |   const initialResponse = waitForDqJson<DqRuleBaseTemplatePage>(
  5487 |     page,
  5488 |     "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  5489 |   );
  5490 |   await gotoDataQualityPage(page, "/dq/ruleBase");
  5491 |   const initialPage = expectDqSuccess(await initialResponse, `${sourceRef}: 内置规则列表应请求成功`);
  5492 |   const records = expectRuleBaseRecords(initialPage, `${sourceRef}: 内置规则列表应返回记录`);
  5493 |   const target =
  5494 |     records.find((record) => record.functionName && record.functionExplain && record.description) ?? records[0];
  5495 |   expect(target, `${sourceRef}: 导出校验应存在目标内置规则`).toBeTruthy();
  5496 | 
  5497 |   const exportButton = page.getByRole("button", { name: "导出规则库" });
  5498 |   await expect(exportButton, `${sourceRef}: 应展示导出规则库按钮`).toBeVisible({ timeout: 30000 });
  5499 |   await exportButton.click({ timeout: 30000 });
  5500 | 
  5501 |   const popconfirm = page.locator(".ant-popconfirm:visible, .ant-popover:visible").last();
  5502 |   await expect(popconfirm, `${sourceRef}: 导出前应展示确认气泡`).toContainText("请确认是否导出规则库", {
  5503 |     timeout: 30000,
  5504 |   });
  5505 |   const [download] = await Promise.all([
  5506 |     page.waitForEvent("download", { timeout: 60000 }),
  5507 |     popconfirm.locator(".ant-btn-primary").click({ timeout: 30000 }),
  5508 |   ]);
  5509 |   expect(download.suggestedFilename(), `${sourceRef}: 导出文件名应为内置规则库 xlsx`).toMatch(
  5510 |     /内置规则库_.+\.xlsx$/,
  5511 |   );
  5512 | 
  5513 |   const downloadPath = join(tmpdir(), `${sourceRef.replace(/[^a-zA-Z0-9_-]/g, "_")}-${Date.now()}.xlsx`);
  5514 |   await download.saveAs(downloadPath);
  5515 |   try {
  5516 |     const workbook = new ExcelJS.Workbook();
  5517 |     await workbook.xlsx.readFile(downloadPath);
  5518 |     const worksheet = workbook.worksheets[0];
  5519 |     expect(worksheet, `${sourceRef}: 导出文件应包含工作表`).toBeTruthy();
  5520 | 
  5521 |     const workbookText = collectWorksheetText(worksheet).join("\n");
  5522 |     for (const header of ["规则名称", "规则解释", "规则分类", "关联范围", "规则状态", "规则描述"]) {
> 5523 |       expect(workbookText, `${sourceRef}: 导出文件应包含列「${header}」`).toContain(header);
       |                                                                 ^ Error: SR-2099-01-DQ-RULEBASE-EXPORT-L7613: 导出文件应包含列「规则状态」
  5524 |     }
  5525 | 
  5526 |     const expectedTexts = [
  5527 |       expectNonEmptyString(target.functionName, `${sourceRef}: 目标规则应包含规则名称`),
  5528 |       expectNonEmptyString(target.functionExplain, `${sourceRef}: 目标规则应包含规则解释`),
  5529 |       formatRuleBaseBuiltInRuleType(target.ruleTaskType, sourceRef),
  5530 |       formatRuleBaseBuiltInRelationRange(target.relationRange, sourceRef),
  5531 |       formatRuleBaseBuiltInOpenStatus(target.openStatus, sourceRef),
  5532 |     ];
  5533 |     if (target.description) {
  5534 |       expectedTexts.push(target.description);
  5535 |     }
  5536 |     for (const expectedText of expectedTexts) {
  5537 |       expect(workbookText, `${sourceRef}: 导出文件应包含内置规则内容「${expectedText}」`).toContain(
  5538 |         expectedText,
  5539 |       );
  5540 |     }
  5541 |   } finally {
  5542 |     if (existsSync(downloadPath)) {
  5543 |       unlinkSync(downloadPath);
  5544 |     }
  5545 |   }
  5546 | }
  5547 | 
  5548 | export async function expectDataQualityRuleBaseBuiltInStatusToggleContract(
  5549 |   page: Page,
  5550 |   sourceRef: string,
  5551 | ): Promise<void> {
  5552 |   const initialResponse = waitForDqJson<DqRuleBaseTemplatePage>(
  5553 |     page,
  5554 |     "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  5555 |   );
  5556 |   await gotoDataQualityPage(page, "/dq/ruleBase");
  5557 |   const initialPage = expectDqSuccess(await initialResponse, `${sourceRef}: 内置规则列表应请求成功`);
  5558 |   const records = expectRuleBaseRecords(initialPage, `${sourceRef}: 内置规则列表应返回记录`);
  5559 |   const target = records.find(
  5560 |     (record) =>
  5561 |       record.id &&
  5562 |       record.functionName === "字段值计算对比" &&
  5563 |       record.relationNumber === 0 &&
  5564 |       record.openStatus === 1,
  5565 |   );
  5566 |   expect(target, `${sourceRef}: 应存在未被规则引用且已开启的内置规则「字段值计算对比」`).toBeTruthy();
  5567 |   const targetRecord = target as DqRuleBaseTemplateRecord;
  5568 |   const ruleName = expectNonEmptyString(targetRecord.functionName, `${sourceRef}: 目标规则应包含规则名称`);
  5569 |   const ruleCategory = formatRuleBaseBuiltInRuleType(targetRecord.ruleTaskType, sourceRef);
  5570 |   const relationRange = formatRuleBaseBuiltInRelationRange(targetRecord.relationRange, sourceRef);
  5571 | 
  5572 |   let restored = false;
  5573 |   try {
  5574 |     const row = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  5575 |     await expect(row, `${sourceRef}: 规则库列表应展示目标规则`).toBeVisible({ timeout: 30000 });
  5576 |     for (const expectedText of [
  5577 |       ruleName,
  5578 |       expectNonEmptyString(targetRecord.functionExplain, `${sourceRef}: 目标规则应包含规则解释`),
  5579 |       ruleCategory,
  5580 |       relationRange,
  5581 |       String(targetRecord.relationNumber),
  5582 |       expectNonEmptyString(targetRecord.description, `${sourceRef}: 目标规则应包含规则描述`),
  5583 |     ]) {
  5584 |       await expect(row, `${sourceRef}: 目标规则行应展示「${expectedText}」`).toContainText(expectedText, {
  5585 |         timeout: 30000,
  5586 |       });
  5587 |     }
  5588 | 
  5589 |     const ruleSwitch = row.locator(".ant-switch").first();
  5590 |     await expect(ruleSwitch, `${sourceRef}: 未引用规则的状态开关应可操作`).toBeEnabled({
  5591 |       timeout: 30000,
  5592 |     });
  5593 |     await expect(ruleSwitch, `${sourceRef}: 目标规则初始应为开启`).toHaveAttribute("aria-checked", "true", {
  5594 |       timeout: 30000,
  5595 |     });
  5596 | 
  5597 |     const closeResponse = waitForDqJson<boolean>(
  5598 |       page,
  5599 |       "/dassets/v1/valid/monitorRuleTemplate/openOrClose",
  5600 |     );
  5601 |     const closedListResponse = waitForDqJson<DqRuleBaseTemplatePage>(
  5602 |       page,
  5603 |       "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  5604 |       (payload) =>
  5605 |         (payload.data?.contentList ?? []).some(
  5606 |           (item) => String(item.id) === String(targetRecord.id) && item.openStatus === 0,
  5607 |         ),
  5608 |     );
  5609 |     await ruleSwitch.click({ timeout: 30000 });
  5610 |     expectDqSuccess(await closeResponse, `${sourceRef}: 关闭内置规则应请求成功`);
  5611 |     restored = false;
  5612 |     await expect(ruleSwitch, `${sourceRef}: 关闭后状态开关应变为关闭`).toHaveAttribute(
  5613 |       "aria-checked",
  5614 |       "false",
  5615 |       { timeout: 30000 },
  5616 |     );
  5617 |     const closedRecords = expectRuleBaseRecords(
  5618 |       expectDqSuccess(await closedListResponse, `${sourceRef}: 关闭后规则库列表应刷新成功`),
  5619 |       `${sourceRef}: 关闭后规则库列表应返回记录`,
  5620 |     );
  5621 |     expect(
  5622 |       closedRecords.find((record) => String(record.id) === String(targetRecord.id))?.openStatus,
  5623 |       `${sourceRef}: 关闭后接口应回显 openStatus=0`,
```