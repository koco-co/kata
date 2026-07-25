#!/usr/bin/env bun

/**
 * 解析 archive.md 中每个用例的监控规则配置，按规则内容去重，
 * 找出哪些用例共享相同的监控规则组合。
 */
import { readFileSync, writeFileSync } from "fs";

const input = process.argv[2];
if (!input) {
  console.error("Usage: bun analyze-cases.ts <archive.md>");
  process.exit(1);
}

const text = readFileSync(input, "utf-8");

// 每个用例以 ##### 开头
const caseBlocks = text.split(/\n(?=##### )/);

// 提取一条规则的标准化 key（忽略规则编号、描述等）
function normalizeRule(stepText: string): string {
  // 提取「监控规则N」到下一个「监控规则」或 step 结束之间的内容
  let config = stepText
    .replace(/「监控规则\d+」配置如下[：:]\s*/g, "")
    .replace(/（不合并）/g, "")
    .replace(/「规则描述」输入「[^」]*」/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // 去掉编号前缀
  config = config.replace(/^\|\s*\d+\s*\|/, "");

  return config;
}

// 提取单条规则的核心参数
interface RuleDef {
  scope: string;          // 生效范围 / 校验类型
  fields: string;         // 字段
  function: string;       // 统计函数
  filter: string;         // 过滤条件
  method: string;         // 校验方法
  expected: string;       // 期望值
  strength: string;       // 强弱规则
  ruleType: string;       // 属于哪个规则类型（完整性校验/有效性校验/...）
  unmergeable: boolean;   // 是否标注不合并
}

function extractRuleFromStep(stepText: string): RuleDef | null {
  if (!stepText.includes("监控规则")) return null;

  const unmergeable = stepText.includes("（不合并）");

  const getVal = (key: string): string => {
    const patterns = [
      new RegExp(`「${key}」[：:]「([^」]*)」`),
      new RegExp(`「${key}」[：:]([^，,「]+)`),
      new RegExp(`「${key}」选择「([^」]*)」`),
    ];
    for (const p of patterns) {
      const m = stepText.match(p);
      if (m) return m[1].trim();
    }
    return "";
  };

  const scope = getVal("生效范围") || getVal("校验类型") || "";
  const fields = getVal("字段") || getVal("选择校验字段") || "";
  const func = getVal("统计函数") || getVal("统计规则") || getVal("引用规则") || "";
  const filter = getVal("过滤条件") || "";
  const method = getVal("校验方法") || getVal("对比方法") || "";
  const expected = getVal("期望值") || getVal("枚举值信息") || "";
  const strength = stepText.includes("强规则") ? "强规则" : stepText.includes("弱规则") ? "弱规则" : "";
  const ruleType = stepText.includes("完整性") ? "完整性校验"
    : stepText.includes("有效性") ? "有效性校验"
    : stepText.includes("唯一性") ? "唯一性校验"
    : stepText.includes("统计性") ? "统计性校验"
    : stepText.includes("自定义SQL") ? "自定义SQL"
    : stepText.includes("一致性") ? "一致性校验"
    : stepText.includes("时效性") ? "时效性校验"
    : stepText.includes("合理性") ? "合理性校验"
    : "";

  return { scope, fields, function: func, filter, method, expected, strength, ruleType, unmergeable };
}

// 生成规则的唯一指纹
function ruleFingerprint(r: RuleDef): string {
  return [
    r.scope,
    r.fields,
    r.function,
    r.filter,
    r.method,
    r.expected,
    r.strength,
    r.ruleType,
    r.unmergeable ? "UNMERGEABLE" : "",
  ].join("|||");
}

// 解析每个用例
interface CaseInfo {
  title: string;
  rulePackName: string;
  rules: RuleDef[];
  ruleFingerprints: string[];
  steps: { stepNum: number; text: string }[];
}

const cases: CaseInfo[] = [];

for (const block of caseBlocks) {
  if (!block.trim()) continue;

  const titleMatch = block.match(/^##### (.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "(未知)";

  // 提取规则包名称
  const rpMatch = block.match(/规则包名称[」】]填写[「「]([^」」]+)/) ||
                  block.match(/引入规则包[「「]([^」」]+)/);
  const rulePackName = rpMatch ? rpMatch[1] : "";

  // 解析步骤表格
  const tableMatch = block.match(/\| 编号 \| 步骤 \| 预期 \|([\s\S]*?)(?=\n\n|$)/);
  if (!tableMatch) continue;

  const rows = tableMatch[1].trim().split("\n");
  const rules: RuleDef[] = [];
  const steps: { stepNum: number; text: string }[] = [];

  let currentRuleType = "";

  for (const row of rows) {
    const cols = row.split("|").map(c => c.trim());
    if (cols.length < 4) continue;
    const stepNum = parseInt(cols[1]);
    const stepText = cols[2];
    const expected = cols[3];

    if (isNaN(stepNum)) continue;

    steps.push({ stepNum, text: stepText });

    // 跟踪当前规则类型
    if (stepText.includes("添加规则-")) {
      const rtMatch = stepText.match(/添加规则[-【]([^】\]]+)/);
      if (rtMatch) currentRuleType = rtMatch[1].trim();
    }

    if (stepText.includes("监控规则")) {
      const rule = extractRuleFromStep(stepText);
      if (rule) {
        if (!rule.ruleType && currentRuleType) {
          rule.ruleType = currentRuleType;
        }
        rules.push(rule);
      }
    }
  }

  cases.push({
    title,
    rulePackName,
    rules,
    ruleFingerprints: rules.map(ruleFingerprint),
    steps,
  });
}

// ─── 分析 ──────────────────────────────────────────

// 1. 构建规则指纹 → 规则详情映射
const fingerprintMap = new Map<string, { rule: RuleDef; count: number }>();
for (const c of cases) {
  for (const r of c.rules) {
    const fp = ruleFingerprint(r);
    const existing = fingerprintMap.get(fp);
    if (existing) {
      existing.count++;
    } else {
      fingerprintMap.set(fp, { rule: r, count: 1 });
    }
  }
}

// 2. 构建规则包指纹（每个用例的完整规则列表指纹）
function rulePackFingerprint(fps: string[]): string {
  return fps.join("|||SEP|||");
}

const rulePackMap = new Map<string, { cases: string[]; rules: RuleDef[] }>();
for (const c of cases) {
  const rpFp = rulePackFingerprint(c.ruleFingerprints);
  const existing = rulePackMap.get(rpFp);
  if (existing) {
    existing.cases.push(c.title);
  } else {
    rulePackMap.set(rpFp, { cases: [c.title], rules: c.rules });
  }
}

// ─── 输出 ──────────────────────────────────────────

let output = "";

output += `# 用例监控规则分析\n\n`;
output += `**分析时间**: ${new Date().toISOString()}\n`;
output += `**用例总数**: ${cases.length}\n`;
output += `**去重后监控规则种类数**: ${fingerprintMap.size}\n`;
output += `**去重后规则包组合数**: ${rulePackMap.size}\n\n`;

// 列出所有去重后的规则
output += `## 去重后的监控规则列表（共 ${fingerprintMap.size} 种）\n\n`;
output += `| # | 规则类型 | 生效范围 | 字段 | 统计函数 | 过滤条件 | 校验方法 | 期望值 | 强弱 | 不合并 | 出现次数 |\n`;
output += `|---|---------|---------|------|---------|---------|---------|--------|------|--------|----------|\n`;

let idx = 1;
const ruleIdMap = new Map<string, number>(); // fp -> id
for (const [fp, { rule, count }] of fingerprintMap.entries()) {
  ruleIdMap.set(fp, idx);
  output += `| ${idx} | ${rule.ruleType} | ${rule.scope} | ${rule.fields} | ${rule.function} | ${rule.filter} | ${rule.method} | ${rule.expected} | ${rule.strength} | ${rule.unmergeable ? "是" : ""} | ${count} |\n`;
  idx++;
}

output += `\n\n`;

// 列出所有规则包组合
output += `## 去重后的规则包组合（共 ${rulePackMap.size} 种）\n\n`;

// 按用例数量排序
const sortedPacks = Array.from(rulePackMap.entries())
  .sort((a, b) => b[1].cases.length - a[1].cases.length);

let packIdx = 1;
for (const [rpFp, { cases: caseList, rules }] of sortedPacks) {
  const ruleIds = rules.map(r => {
    const fp = ruleFingerprint(r);
    return ruleIdMap.get(fp) || "?";
  });

  output += `### 规则包组合 #${packIdx}（${caseList.length} 个用例共享）\n\n`;
  output += `**包含规则**: ${ruleIds.join(", ")}（共 ${rules.length} 条）\n\n`;
  output += `**涉及用例**:\n`;
  for (const c of caseList) {
    output += `- ${c}\n`;
  }
  output += `\n`;
  packIdx++;
}

// 特别关注：哪些用例的规则完全相同
output += `## 具有完全相同规则配置的用例组\n\n`;

const identicalGroups = sortedPacks.filter(([_, v]) => v.cases.length > 1);

if (identicalGroups.length > 0) {
  for (const [rpFp, { cases: caseList }] of identicalGroups) {
    output += `### 共享规则组（${caseList.length} 个用例）\n\n`;
    for (const c of caseList) {
      output += `- ${c}\n`;
    }
    output += `\n`;
  }
} else {
  output += `（没有两个用例的规则配置完全相同）\n\n`;
}

// 特别关注：哪些用例的规则是另一个的子集
output += `## 规则子集/超集关系\n\n`;

for (let i = 0; i < cases.length; i++) {
  for (let j = i + 1; j < cases.length; j++) {
    const fpsI = new Set(cases[i].ruleFingerprints);
    const fpsJ = new Set(cases[j].ruleFingerprints);

    const iInJ = Array.from(fpsI).every(f => fpsJ.has(f));
    const jInI = Array.from(fpsJ).every(f => fpsI.has(f));

    if (iInJ && jInI) {
      // 完全相同，已经在上面报告
    } else if (iInJ) {
      const onlyInJ = Array.from(fpsJ).filter(f => !fpsI.has(f));
      output += `- **"${cases[i].title}"** 的规则(${fpsI.size}条) 完全包含在 **"${cases[j].title}"**(${fpsJ.size}条) 中\n`;
      output += `  - 多出的规则: ${onlyInJ.map(f => "#" + (ruleIdMap.get(f) || "?")).join(", ")}\n`;
    } else if (jInI) {
      const onlyInI = Array.from(fpsI).filter(f => !fpsJ.has(f));
      output += `- **"${cases[j].title}"** 的规则(${fpsJ.size}条) 完全包含在 **"${cases[i].title}"**(${fpsI.size}条) 中\n`;
      output += `  - 多出的规则: ${onlyInI.map(f => "#" + (ruleIdMap.get(f) || "?")).join(", ")}\n`;
    }
  }
}

output += `\n## 汇总：如果你要覆盖所有不同规则组合，最少需要创建以下规则包\n\n`;

// 贪心算法：找最小覆盖
const allFingerprints = new Set<string>();
for (const c of cases) {
  for (const fp of c.ruleFingerprints) {
    allFingerprints.add(fp);
  }
}

output += `**所有用例中出现的不同规则共 ${allFingerprints.size} 条**\n\n`;
output += `**去重后规则包组合共 ${rulePackMap.size} 种**，按用例数从多到少排列：\n\n`;

const sortedPacks2 = Array.from(rulePackMap.entries())
  .sort((a, b) => b[1].cases.length - a[1].cases.length);

for (let i = 0; i < sortedPacks2.length; i++) {
  const [_, { cases: caseList }] = sortedPacks2[i];
  output += `${i + 1}. ${caseList.length} 个用例共享同一组规则\n`;
}

const outPath = input.replace(/archive\.md$/, "rule-analysis.md");
writeFileSync(outPath, output, "utf-8");
console.log(`Analysis written to: ${outPath}`);
console.log(`Total cases: ${cases.length}`);
console.log(`Unique rules: ${fingerprintMap.size}`);
console.log(`Unique rule pack combinations: ${rulePackMap.size}`);
console.log(`Identical groups: ${identicalGroups.length}`);
