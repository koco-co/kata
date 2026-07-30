import { describe, expect, it } from "bun:test";
import { normalizeCasesYamlText } from "../../cli/lib/cases/serialize.ts";
import { normalizeStructuredText } from "../../runtime/cases/normalize.ts";

describe("normalizeStructuredText", () => {
  it("normalizes CRLF and br tags", () => {
    expect(normalizeStructuredText("第一行<br>第二行\r\n第三行")).toBe("第一行\n第二行\n第三行");
  });

  it("normalizes tabs to spaces for canonical YAML block scalars", () => {
    expect(normalizeStructuredText("\t1) 表A\n\t2) 表B")).toBe("  1) 表A\n  2) 表B");
  });

  it("splits obvious concatenated numbered items", () => {
    expect(normalizeStructuredText("1) 打开页面 2) 点击保存 3) 返回列表")).toBe(
      "1) 打开页面\n2) 点击保存\n3) 返回列表",
    );
  });

  it("splits nested full-width numbered items without treating rule numbers as markers", () => {
    expect(
      normalizeStructuredText(
        "1、规则1、5、7合并；规则2、10合并。 1）源表只扫描一次 2）规则并行计算 3）结果拆成多行",
      ),
    ).toBe(
      "1、 规则1、5、7合并；规则2、10合并。\n1） 源表只扫描一次\n2） 规则并行计算\n3） 结果拆成多行",
    );
  });

  it("splits list markers concatenated directly after numeric field values", () => {
    expect(
      normalizeStructuredText(
        "配置如下:1) 监控对象: date=202602022) 监控规则: value>=03) 调度属性: 每小时",
      ),
    ).toBe("配置如下:\n1) 监控对象: date=20260202\n2) 监控规则: value>=0\n3) 调度属性: 每小时");
  });

  it("keeps a numbered run intact after form bullets expose markers on separate lines", () => {
    expect(
      normalizeStructuredText(
        "配置如下:1)监控对象:- 日期: 202602022)监控规则:- 阈值: >=03)调度属性:- 周期: 小时",
      ),
    ).toBe(
      "配置如下:\n1) 监控对象:\n- 日期: 20260202\n2) 监控规则:\n- 阈值: >=0\n3) 调度属性:\n- 周期: 小时",
    );
  });

  it("puts concatenated form bullets on separate lines", () => {
    expect(
      normalizeStructuredText(
        `配置如下: - 数据源: \${DataSourceA} - 数据表: user_profile - 规则强弱: 强规则`,
      ),
    ).toBe(`配置如下:\n- 数据源: \${DataSourceA}\n- 数据表: user_profile\n- 规则强弱: 强规则`);
  });

  it("splits a form bullet concatenated after another bullet", () => {
    expect(normalizeStructuredText("- 其它默认- 实例生成方式: 「立即生成」")).toBe(
      "- 其它默认\n- 实例生成方式: 「立即生成」",
    );
  });

  it("keeps standalone bullets in a structured form on separate lines", () => {
    expect(
      normalizeStructuredText(
        "3) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」",
      ),
    ).toBe(
      "3) 调度属性:\n- 调度周期: 时\n- 生效日期: T~T+1\n- 间隔时间: 1小时\n- 其它默认\n- 实例生成方式: 「立即生成」",
    );
  });

  it("does not split versions, SQL, or ordinary prose", () => {
    const text =
      "适配 v6.4.11 和版本 1.0、2.0，执行 substring(name, 1, 2) 与 foo(1) and bar(2) 后校验 SQL: a-b";
    expect(normalizeStructuredText(text)).toBe(text);
  });

  it("does not treat decimal data as concatenated numbered items", () => {
    const data = "1. 新建测试表并写入数据：张三，11，72.11，1，1；2，李四，20，60.22，2，2";
    expect(normalizeStructuredText(data)).toBe(data);
  });

  it("does not combine numbered markers across SQL lines", () => {
    const sql = `-- 1. 建表语句 (DDL)
guide_price DECIMAL(20,2) COMMENT '官方指导价',
-- 2. 数据插入语句 (DML)`;
    expect(normalizeStructuredText(sql)).toBe(sql);
  });
});

describe("normalizeCasesYamlText", () => {
  it("preserves comments while adding defaults and block-style structured text", () => {
    const source = `meta:
  title: 需求
cases:
  - case_id: C0001
    title: 验证表单
    priority: P1
    steps:
      # 字段顺序来自历史用例
      - action: "配置如下: - 数据源: A - 数据表: B"
        expected: "1) 成功 2) 返回"
`;
    const normalized = normalizeCasesYamlText(source, { exports: ["xmind"] });
    expect(normalized).toContain("# 字段顺序来自历史用例");
    expect(normalized).toContain('case_module_id: ""');
    expect(normalized).toContain("exports:\n    - xmind");
    expect(normalized).toContain("action: |-\n          配置如下:");
    expect(normalized).toContain("expected: |-\n          1) 成功\n          2) 返回");
  });
});
