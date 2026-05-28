#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const archivePath = join(featureDir, "岚图已上线需求主流程用例.md");
const EXPECTED_CASES = 1216;
const RULE_TASK_CHAIN =
  "业务链路要求：与本用例相关的规则任务需先在【数据质量 → 规则集管理】按数据表创建规则集和规则包，再在【数据质量 → 规则任务管理】通过【导入规则包】引用生成；前置中提到的已存在规则任务均指该链路下已保存且可执行的规则任务。";

const stats = {
  cases: 0,
  decoded: 0,
  htmlCleaned: 0,
  dataSourceAligned: 0,
  emptyPreconditions: 0,
  legacyRuleTask: 0,
  ruleTaskBusinessChain: 0,
  runDetailExpanded: 0,
  downloadExpanded: 0,
  uiCheckReplaced: 0,
  assumptionTextReplaced: 0,
  placeholderRepaired: 0,
  emptyStepsFilled: 0,
  ruleTaskBusinessChainRemoved: 0,
};

function decodeText(value) {
  const input = String(value ?? "");
  const output = input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(?:p|span|div|font)[^>]*>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (output !== input.trim()) stats.decoded += 1;
  if (/<\/?(?:p|span|div|font)[^>]*>/i.test(input)) stats.htmlCleaned += 1;
  return output;
}

function normalizeNavigation(text) {
  return String(text ?? "")
    .replace(/进入数据质量-规则任务管理-单表校验规则/g, "进入【数据质量 → 规则任务管理】页面，点击【新建监控规则】")
    .replace(/进入数据质量-规则任务管理模块，新建单表规则/g, "进入【数据质量 → 规则任务管理】页面，点击【新建监控规则】")
    .replace(/进入数据质量-规则任务管理-选择([^，,]+)，点击表名/g, "进入【数据质量 → 规则任务管理】页面，搜索并打开规则任务「$1」详情，点击表名")
    .replace(/进入数据质量-规则任务管理，选择任务([^，,]+)点击表名/g, "进入【数据质量 → 规则任务管理】页面，搜索并打开规则任务「$1」详情，点击表名")
    .replace(/进入数据质量-校验结果查询/g, "进入【数据质量 → 校验结果查询】页面")
    .replace(/选择一个(唯一性|完整性|有效性|统计性|合理性|时效性|一致性)校验，点击(编辑|克隆)/g, "在详情规则列表中选择已保存的「$1校验」规则，点击【$2】")
    .replace(/选择其中一个校验框点击右上角克隆/g, "选择当前规则包中已保存的规则配置项，点击右上角【克隆】")
    .replace(/点击添加规则-/g, "在规则包中点击【新增规则】，选择")
    .replace(/点击添加规则，选择/g, "在规则包中点击【新增规则】，选择")
    .replace(/选项均为默认，点击新建/g, "在【调度属性】页保持默认配置，点击【保存】")
    .replace(/点击立即执行-进入校验结果查询/g, "点击任务【立即执行】，进入【数据质量 → 校验结果查询】并打开本次最新实例详情")
    .trim();
}

function escapeCell(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .replace(/\|/g, "\\|")
    .replace(/\n/g, "<br>");
}

function splitTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed
    .slice(1, -1)
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function markdownFence(text) {
  const runs = [...String(text ?? "").matchAll(/`{3,}/g)].map((match) => match[0].length);
  return "`".repeat(Math.max(3, Math.max(2, ...runs) + 1));
}

function unwrapRedundantFence(text) {
  const lines = String(text ?? "").trim().split("\n");
  const firstFence = lines[0]?.trim().match(/^(`{4,})$/)?.[1];
  if (!firstFence) return String(text ?? "").trim();
  const closeIndex = lines.findIndex((line, index) => index > 0 && line.trim() === firstFence);
  if (closeIndex === -1) return String(text ?? "").trim();

  const inner = lines.slice(1, closeIndex).join("\n").trim();
  const trailing = lines.slice(closeIndex + 1).join("\n").trim();
  return [inner, trailing].filter(Boolean).join("\n").trim();
}

function extractCaseBlock(block) {
  const lines = block.split("\n");
  const heading = lines[0] ?? "";
  const title = heading.replace(/^#####\s+/, "").trim();
  const preIndex = lines.findIndex((line) => line.trim() === "> 前置条件");
  const stepsIndex = lines.findIndex((line) => line.trim() === "> 用例步骤");
  let preconditions = "";
  const steps = [];

  if (preIndex !== -1 && stepsIndex !== -1) {
    const preLines = lines.slice(preIndex + 1, stepsIndex);
    const firstFence = preLines.findIndex((line) => /^`{3,}$/.test(line.trim()));
    const fenceMarker = firstFence === -1 ? "" : preLines[firstFence].trim();
    const lastFence = fenceMarker
      ? preLines.findLastIndex((line, index) => index > firstFence && line.trim() === fenceMarker)
      : -1;
    if (firstFence !== -1 && lastFence !== -1 && lastFence > firstFence) {
      preconditions = preLines.slice(firstFence + 1, lastFence).join("\n");
    } else {
      preconditions = preLines.join("\n");
    }
    preconditions = unwrapRedundantFence(preconditions);

    for (const line of lines.slice(stepsIndex + 1)) {
      if (!line.trim().startsWith("|")) continue;
      if (/^\|\s*编号\s*\|/.test(line) || /^\|\s*-+\s*\|/.test(line)) continue;
      const cells = splitTableRow(line);
      if (!cells || cells.length < 3) continue;
      steps.push({
        step: cells[1],
        expected: cells.slice(2).join("|"),
      });
    }
  }

  return { title, preconditions, steps };
}

function renderCase(testCase) {
  const preconditions = testCase.preconditions.trim();
  const fence = markdownFence(preconditions);
  const lines = [
    `##### ${testCase.title}`,
    "",
    "> 前置条件",
    "",
    fence,
    preconditions,
    fence,
    "",
    "> 用例步骤",
    "",
    "| 编号 | 步骤 | 预期 |",
    "| --- | --- | --- |",
  ];

  testCase.steps.forEach((step, index) => {
    lines.push(`| ${index + 1} | ${escapeCell(step.step)} | ${escapeCell(step.expected)} |`);
  });

  return `${lines.join("\n")}\n`;
}

function isDataQualityCase(context, testCase) {
  const text = [context.version, context.section, testCase.title, testCase.preconditions, ...testCase.steps.flatMap((step) => [step.step, step.expected])].join("\n");
  return /数据质量|规则库|规则集|规则任务|监控规则|质量规则|校验结果|数据质量报告|通用配置/.test(text);
}

function isRuleTaskRelated(context, testCase) {
  const text = [context.section, testCase.title, testCase.preconditions, ...testCase.steps.flatMap((step) => [step.step, step.expected])]
    .join("\n")
    .replaceAll(RULE_TASK_CHAIN, "");
  return /规则任务管理|新建监控规则|导入规则包|规则任务|校验结果查询|立即执行|任务详情|调度属性|数据质量报告/.test(text) && !/报告搜索优化/.test(context.section ?? "");
}

function hasRuleSetChain(testCase) {
  const text = [testCase.preconditions, ...testCase.steps.flatMap((step) => [step.step, step.expected])].join("\n").replaceAll(RULE_TASK_CHAIN, "");
  return /规则集管理|规则包|导入规则包/.test(text);
}

function isLegacyRuleTask(testCase) {
  const text = [testCase.preconditions, ...testCase.steps.flatMap((step) => [step.step, step.expected])].join("\n");
  return (
    /进入【数据质量 → 规则任务管理】页面，点击【新建监控规则】/.test(text) &&
    /选择数据源：已有数据源|选择数据源: 已有数据源/.test(text) &&
    !/导入规则包|规则集管理/.test(text)
  );
}

function deriveRuleType(context, testCase) {
  const knownTypes = ["唯一性校验", "完整性校验", "有效性校验", "统计性校验", "合理性校验", "时效性校验", "一致性校验"];
  const text = [context.section, testCase.title, ...testCase.steps.map((step) => step.step)].join("\n");
  const headingText = [context.section, testCase.title].join("\n");
  for (const type of knownTypes) {
    if (headingText.includes(type)) return type;
  }
  if (/Z-?\s*score|IQR|离群点|置信区间|统计函数|标准差|平均值|波动率/.test(text)) return "统计性校验";
  if (/唯一|去重|重复/.test(text)) return "唯一性校验";
  if (/一致性|比对表|对比表|多表数据一致/.test(text)) return "一致性校验";
  if (/key范围校验|非空|空值|完整率|缺失/.test(text)) return "完整性校验";
  const explicit = text.match(/选择[【「"]?([^\n，,】」"]+?校验)[】」"]?/)?.[1]?.replace(/[【】「」"]/g, "").trim();
  if (explicit && knownTypes.includes(explicit)) return explicit;
  for (const type of knownTypes) {
    if (text.includes(type)) return type;
  }
  if (/正则|格式|取值范围|身份证|手机号|邮箱|日期格式|期望值/.test(text)) return "有效性校验";
  return "质量校验";
}

function deriveRuleName(testCase) {
  const text = [testCase.preconditions, ...testCase.steps.map((step) => step.step)].join("\n");
  const explicit = text.match(/规则名称[：:]\s*([^\n<]+)/)?.[1]?.trim();
  if (explicit && explicit !== "本用例规则任务") return explicit;
  return testCase.title
    .replace(/^【P\d】/, "")
    .replace(/[^\p{Script=Han}A-Za-z0-9_]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "质量规则任务";
}

function deriveTableName(testCase) {
  const text = [testCase.preconditions, ...testCase.steps.map((step) => step.step)].join("\n");
  const selected = text.match(/选择数据表[：:]\s*([^\n<]+)/)?.[1]?.replace(/[「」`"]/g, "").trim();
  if (selected && !["IF", "前置 SQL 对应数据表", "当前校验场景测试表", "已有数据表"].includes(selected)) return selected;

  const created = text
    .match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"A-Za-z0-9_.\u4e00-\u9fa5-]+)/i)?.[1]
    ?.replace(/[`"]/g, "")
    .trim();
  if (created && created !== "IF") return created;

  const dropped = text
    .match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([`"A-Za-z0-9_.\u4e00-\u9fa5-]+)/i)?.[1]
    ?.replace(/[`"]/g, "")
    .trim();
  if (dropped && dropped !== "IF") return dropped;

  if (/唯一|去重|重复/.test(text)) return "test_weiyi_01";
  if (/Z-?\s*score|IQR|离群点|统计函数|置信区间/.test(text)) return "test_tongji_01";
  if (/一致性|比对表|对比表|多表数据一致/.test(text)) return "tableA";
  if (/正则|格式|取值范围|身份证|手机号|邮箱|日期格式|期望值/.test(text)) return "test_youxiao_01";
  if (/json/i.test(text)) return "test_json_quality";
  return "quality_rule_test_table";
}

function deriveDataSourceName(testCase) {
  const preconditions = decodeText(testCase.preconditions);
  if (/SparkThrift|spark/i.test(preconditions)) return "SparkThrift2.x 测试数据源";
  if (/Hive|hive/i.test(preconditions)) return "Hive 测试数据源";
  if (/Doris|doris|quality_test_db|test_doris|test_youxiao|test_tongji|test_json|json_/i.test(preconditions)) return "测试数据源_Doris";
  if (/MySQL|mysql/i.test(preconditions)) return "MySQL 测试数据源";

  const text = [preconditions, ...testCase.steps.map((step) => step.step)].join("\n");
  const selected = text.match(/选择数据源[：:]\s*([^\n<]+)/)?.[1]?.replace(/[「」`"*]/g, "").trim();
  if (selected && !["已有数据源", "前置 SQL 对应数据源"].includes(selected)) return selected;
  if (/SparkThrift|spark/i.test(text)) return "SparkThrift2.x 测试数据源";
  if (/Doris|doris|quality_test_db|test_doris|test_youxiao|test_tongji|test_weiyi|test_json|json_/i.test(text)) return "测试数据源_Doris";
  if (/Hive/i.test(text)) return "Hive 测试数据源";
  if (/MySQL/i.test(text)) return "MySQL 测试数据源";
  return "数据质量测试数据源";
}

function deriveDatabaseName(testCase) {
  const preconditions = decodeText(testCase.preconditions);
  const text = [preconditions, ...testCase.steps.map((step) => step.step)].join("\n");
  if (/SparkThrift|spark|Hive|hive|tableA/i.test(preconditions)) return "default";
  const selected = text.match(/选择数据库[：:]\s*([^\n<]+)/)?.[1]?.replace(/[「」`"*]/g, "").trim();
  if (selected && !["已有数据库", "前置 SQL 对应数据库"].includes(selected)) return selected;
  const qualifiedTable =
    text.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?([A-Za-z0-9_\u4e00-\u9fa5-]+)\.[`"]?[A-Za-z0-9_\u4e00-\u9fa5-]+/i)?.[1] ||
    text.match(/选择数据表[：:]\s*([A-Za-z0-9_\u4e00-\u9fa5-]+)\.[A-Za-z0-9_\u4e00-\u9fa5-]+/)?.[1];
  if (qualifiedTable) return qualifiedTable;
  if (/SparkThrift|spark|tableA/i.test(text)) return "default";
  if (/Doris|doris|quality_test_db|test_doris|test_youxiao|test_tongji|test_weiyi|test_json|json_/i.test(text)) return "quality_test_db";
  return "quality_test_db";
}

function normalizeDataSourceForTable(dataSourceName, tableName) {
  if (dataSourceName !== "数据质量测试数据源") return dataSourceName;
  if (/^(test_|json_|quality_)/i.test(tableName)) return "测试数据源_Doris";
  if (/^table[A-Z]/.test(tableName)) return "SparkThrift2.x 测试数据源";
  return dataSourceName;
}

function alignDataSourceAndDatabase(context, testCase) {
  if (!isDataQualityCase(context, testCase)) return;
  const dataSourceName = normalizeDataSourceForTable(deriveDataSourceName(testCase), deriveTableName(testCase));
  const databaseName = deriveDatabaseName(testCase);
  const explicitSource = /SparkThrift|spark|Hive|hive|Doris|doris|MySQL|mysql/i.test(decodeText(testCase.preconditions));
  if (!explicitSource) return;

  for (const step of testCase.steps) {
    const before = step.step;
    step.step = step.step
      .replace(/选择数据源「[^」]+」/g, `选择数据源「${dataSourceName}」`)
      .replace(/选择数据源：[^<\n]+/g, `选择数据源：${dataSourceName}`)
      .replace(/\*选择数据源：[^<\n]+/g, `*选择数据源：${dataSourceName}`)
      .replace(/数据库「[^」]+」/g, `数据库「${databaseName}」`)
      .replace(/选择数据库「[^」]+」/g, `选择数据库「${databaseName}」`)
      .replace(/选择数据库：[^<\n]+/g, `选择数据库：${databaseName}`)
      .replace(/\*选择数据库：[^<\n]+/g, `*选择数据库：${databaseName}`);
    if (step.step !== before) stats.dataSourceAligned += 1;
  }
}

function deriveStepText(testCase, pattern, fallback) {
  return testCase.steps.find((step) => pattern.test(step.step))?.step ?? fallback;
}

function deriveExpected(testCase) {
  return (
    testCase.steps.find((step) => /校验完成|实例状态|提示校验|详情查看|运行结果|状态显示/.test(step.expected))?.expected ||
    testCase.steps.at(-1)?.expected ||
    "本次执行结果与用例标题中的校验场景一致。"
  );
}

function rewriteLegacyRuleTask(context, testCase) {
  const ruleName = deriveRuleName(testCase);
  const tableName = deriveTableName(testCase);
  const dataSourceName = normalizeDataSourceForTable(deriveDataSourceName(testCase), tableName);
  const databaseName = deriveDatabaseName(testCase);
  const ruleType = deriveRuleType(context, testCase);
  const packageName = `${ruleType}规则包`;
  const ruleSetName = `${ruleName}_规则集`;
  const monitorObject = deriveStepText(testCase, /规则名称[：:]/, `规则名称：${ruleName}\n选择数据源：${dataSourceName}\n选择数据库：${databaseName}\n选择数据表：${tableName}`);
  const ruleConfig = deriveStepText(testCase, /选择校验字段|统计函数|过滤条件|期望值|对比表|输入分区|选择分区/, `按「${testCase.title.replace(/^【P\d】/, "")}」配置${ruleType}规则参数`);
  const finalExpected = deriveExpected(testCase);

  testCase.preconditions = enrichLoginPrecondition(testCase.preconditions, context);
  testCase.steps = [
    {
      step: `进入【数据质量 → 规则集管理】页面，点击【新建规则集】，选择数据源「${dataSourceName}」、数据库「${databaseName}」、数据表「${tableName}」，新增规则包「${packageName}」，点击【下一步】`,
      expected: `进入 Step 2【监控规则】页面，规则集「${ruleSetName}」的规则包「${packageName}」可配置。`,
    },
    {
      step: `在 Step 2【监控规则】中点击【新增规则】，选择「${ruleType}」，按以下参数完成规则配置并保存：\n${ruleConfig}\n保存规则后点击页面底部【保存】`,
      expected: `规则集保存成功，规则包「${packageName}」中存在本用例需要的「${ruleType}」规则。`,
    },
    {
      step: `进入【数据质量 → 规则任务管理】页面，点击【新建监控规则】，在 Step 1【监控对象】填写以下内容后点击【下一步】：\n${monitorObject}`,
      expected: "进入 Step 2【监控规则】页面，监控对象与规则集所属数据表一致。",
    },
    {
      step: `在 Step 2【监控规则】点击【导入规则包】，选择规则集「${ruleSetName}」和规则包「${packageName}」，确认导入后点击【下一步】`,
      expected: `规则包导入成功，页面展示导入的「${ruleType}」规则，规则参数与规则集配置一致。`,
    },
    {
      step: "在 Step 3【调度属性】页保持默认调度配置，实例生成方式选择【立即生成】，点击【保存】",
      expected: `规则任务「${ruleName}」保存成功，并出现在规则任务列表中。`,
    },
    {
      step: `在规则任务列表搜索并打开「${ruleName}」详情，核对监控对象、规则包、规则内容、分区配置和调度属性`,
      expected: "任务详情展示的业务字段与本用例创建配置一致。新增、导入、保存后的状态均可追溯。",
    },
    {
      step: `点击任务「${ruleName}」的【立即执行】，进入【数据质量 → 校验结果查询】页面，打开本次最新实例详情`,
      expected: finalExpected,
    },
  ];
  stats.legacyRuleTask += 1;
}

function enrichLoginPrecondition(preconditions, context) {
  let result = decodeText(preconditions);
  if (!result || result === "无") {
    stats.emptyPreconditions += 1;
    if (/数据标准|落标|标准/.test([context.section, context.currentTitle].join("\n"))) {
      return "已使用具备【数据标准】模块权限的账号登录数据资产平台。";
    }
    if (/数据地图|元数据|资产目录|标签|指标|字段/.test([context.section, context.currentTitle].join("\n"))) {
      return "已使用具备【数据地图/元数据】相关权限的账号登录数据资产平台。";
    }
    if (/数据安全|权限|脱敏|密级|分类分级/.test([context.section, context.currentTitle].join("\n"))) {
      return "已使用具备【数据安全】模块权限的账号登录数据资产平台。";
    }
    if (/资产盘点|资产/.test([context.section, context.currentTitle].join("\n"))) {
      return "已使用具备【资产】模块权限的账号登录数据资产平台。";
    }
    return "已使用具备对应模块权限的账号登录数据资产平台。";
  }

  if (/^假设/.test(result)) {
    result = result.replace(/^假设/, "前置数据要求：");
    stats.assumptionTextReplaced += 1;
  }
  return result;
}

function addRuleTaskBusinessChainPrecondition(testCase) {
  if (!testCase.preconditions.includes("业务链路要求：")) {
    testCase.preconditions = `${testCase.preconditions.trim()}\n${RULE_TASK_CHAIN}`.trim();
    stats.ruleTaskBusinessChain += 1;
  }
}

function cleanupRuleTaskBusinessChain(context, testCase) {
  if (!testCase.preconditions.includes(RULE_TASK_CHAIN)) return;
  if (isRuleTaskRelated(context, testCase)) return;
  testCase.preconditions = testCase.preconditions
    .split("\n")
    .filter((line) => line.trim() !== RULE_TASK_CHAIN)
    .join("\n")
    .trim();
  stats.ruleTaskBusinessChainRemoved += 1;
}

function expandRunDetailSteps(testCase) {
  const text = testCase.steps.map((step) => `${step.step}\n${step.expected}`).join("\n");
  if (!/(立即执行|执行校验|运行)/.test(text)) return;
  if (/校验结果查询|实例详情|执行记录|运行记录|YARN|yarn|任务明细|同步详情/.test(text)) return;
  testCase.steps.push({
    step: "进入【数据质量 → 校验结果查询】页面，按任务名称和执行时间定位本次最新实例并打开详情",
    expected: "最新实例与本次执行任务匹配，实例状态、质检结果、未通过原因、操作列和详情字段均按本用例场景展示。",
  });
  stats.runDetailExpanded += 1;
}

function expandDownloadSteps(testCase) {
  const text = testCase.steps.map((step) => `${step.step}\n${step.expected}`).join("\n");
  if (!/(下载|导出)/.test(text)) return;
  if (/(文件|Excel|xlsx|CSV|字段|命名|下载完成|导出内容)/i.test(text)) return;
  testCase.steps.push({
    step: "打开下载或导出的文件，核对文件格式、文件命名、表头字段和数据内容",
    expected: "文件可正常打开；文件名、表头字段、筛选条件对应的数据范围与页面当前业务状态一致。",
  });
  stats.downloadExpanded += 1;
}

function fillEmptySteps(context, testCase) {
  if (testCase.steps.length > 0) return;

  const title = testCase.title;
  if (!/自定义SQL模版 新增 基本信息 验证关联范围/.test(title)) return;

  testCase.preconditions =
    "已使用具备【数据质量 → 规则库配置】权限的账号登录数据资产平台。\n已进入【数据质量 → 规则库配置 → 自定义SQL模版】新增页面，且【基本信息】区域可编辑。";

  const baseStep = {
    step: "进入【数据质量 → 规则库配置】页面，切换到【自定义SQL模版】，点击【新增】，定位【基本信息】区域的【关联范围】字段",
    expected: "新增表单打开成功，【关联范围】字段展示在【基本信息】区域内。",
  };

  if (/提示词：请选择/.test(title)) {
    testCase.steps = [
      baseStep,
      {
        step: "不选择【关联范围】，查看字段默认展示文案",
        expected: "【关联范围】下拉框默认提示为「请选择」。",
      },
    ];
  } else if (/选择枚举/.test(title)) {
    testCase.steps = [
      baseStep,
      {
        step: "展开【关联范围】下拉框，依次查看并选择「字段级」「表级」「多表」",
        expected: "下拉枚举包含「字段级」「表级」「多表」；每个枚举均可被选中并回显到字段中。",
      },
    ];
  } else if (/必选/.test(title)) {
    testCase.steps = [
      baseStep,
      {
        step: "填写规则名称、规则分类等其它必填项，保持【关联范围】为空，点击【保存】",
        expected: "页面阻止保存，并在【关联范围】字段下展示必填校验提示。",
      },
    ];
  } else if (/仅支持单选/.test(title)) {
    testCase.steps = [
      baseStep,
      {
        step: "展开【关联范围】下拉框，先选择「字段级」，再选择「表级」",
        expected: "字段仅保留最后一次选择的「表级」，未出现多选标签或多个已选值。",
      },
    ];
  }

  if (testCase.steps.length > 0) stats.emptyStepsFilled += 1;
}

function replaceUiCheck(step) {
  const before = step.step;
  if (/^(页面UI CHECK|页面模块UI CHECK|弹窗UI CHECK|UI CHECK|DATA CHECK|「[^」]+」页面UI CHECK|「[^」]+」弹窗UI CHECK|【[^】]+】页面UI CHECK|【[^】]+】模块UI CHECK)$/.test(step.step.trim())) {
    const original = step.step.trim();
    if (original.includes("DATA")) {
      step.step = "核对列表数据、字段值、排序状态和分页数据范围";
    } else if (original.includes("弹窗")) {
      step.step = "查看弹窗标题、表单字段、提示文案、按钮和默认值";
    } else {
      step.step = "查看页面筛选区、列表列、操作列、按钮、分页和默认展示状态";
    }
    stats.uiCheckReplaced += 1;
  } else {
    step.step = step.step
      .replace(/页面模块UI CHECK/g, "查看页面模块界面元素")
      .replace(/页面UI CHECK/g, "查看页面界面元素")
      .replace(/弹窗UI CHECK/g, "查看弹窗界面元素")
      .replace(/UI CHECK/g, "查看界面元素")
      .replace(/DATA CHECK/g, "核对业务数据");
    if (step.step !== before) stats.uiCheckReplaced += 1;
  }
}

function repairGeneratedPlaceholders(context, testCase) {
  const text = [testCase.preconditions, ...testCase.steps.flatMap((step) => [step.step, step.expected])].join("\n");
  if (!isDataQualityCase(context, testCase)) return;
  if (!/本用例规则任务|数据表「IF」|前置 SQL 对应|当前校验场景测试表|数据质量测试数据源|已有数据源|已有数据库|已有数据表|一个校验|其中一个校验|质量校验|【[^\n」]*校验|进入数据质量-/.test(text)) return;

  const tableName = deriveTableName(testCase);
  const dataSourceName = normalizeDataSourceForTable(deriveDataSourceName(testCase), tableName);
  const databaseName = deriveDatabaseName(testCase);
  const ruleName = deriveRuleName(testCase);
  const ruleType = deriveRuleType(context, testCase).replace(/[【】「」"]/g, "");
  const packageName = `${ruleType}规则包`;

  for (const step of testCase.steps) {
    const beforeStep = step.step;
    const beforeExpected = step.expected;
    step.step = step.step
      .replaceAll("本用例规则任务_规则集", `${ruleName}_规则集`)
      .replaceAll("本用例规则任务", ruleName)
      .replace(/选择前置 SQL 对应的数据源、数据库、数据表「[^」]+」/g, `选择数据源「${dataSourceName}」、数据库「${databaseName}」、数据表「${tableName}」`)
      .replace(/选择数据源「数据质量测试数据源」、数据库「([^」]+)」、数据表「([^」]+)」/g, `选择数据源「${dataSourceName}」、数据库「${databaseName}」、数据表「${tableName}」`)
      .replace(/数据表「已有数据表」/g, `数据表「${tableName}」`)
      .replace(/数据表「当前校验场景测试表」/g, `数据表「${tableName}」`)
      .replace(/数据表「IF」/g, `数据表「${tableName}」`)
      .replace(/数据表「前置 SQL 对应数据表」/g, `数据表「${tableName}」`)
      .replace(/选择数据源：前置 SQL 对应数据源/g, `选择数据源：${dataSourceName}`)
      .replace(/选择数据源：数据质量测试数据源/g, `选择数据源：${dataSourceName}`)
      .replace(/选择数据库：前置 SQL 对应数据库/g, `选择数据库：${databaseName}`)
      .replace(/选择数据源：已有数据源/g, `选择数据源：${dataSourceName}`)
      .replace(/选择数据库：已有数据库/g, `选择数据库：${databaseName}`)
      .replace(/选择数据表：已有数据表/g, `选择数据表：${tableName}`)
      .replace(/选择数据表：当前校验场景测试表/g, `选择数据表：${tableName}`)
      .replace(/选择数据表：IF/g, `选择数据表：${tableName}`)
      .replace(/选择数据表：前置 SQL 对应数据表/g, `选择数据表：${tableName}`)
      .replace(/规则包「(?:一个|其中一个|质量)校验规则包」/g, `规则包「${packageName}」`)
      .replace(/新增规则包「(?:一个|其中一个|质量)校验规则包」/g, `新增规则包「${packageName}」`)
      .replace(/选择「(?:一个|质量)校验」/g, `选择「${ruleType}」`)
      .replace(/「【([^」]+?校验)规则包」/g, "「$1规则包」")
      .replace(/「【([^」]+?校验)」/g, "「$1」");
    step.expected = step.expected
      .replaceAll("本用例规则任务_规则集", `${ruleName}_规则集`)
      .replaceAll("本用例规则任务", ruleName)
      .replace(/规则包「(?:一个|其中一个|质量)校验规则包」/g, `规则包「${packageName}」`)
      .replace(/「(?:一个|质量)校验」规则/g, `「${ruleType}」规则`)
      .replace(/规则包「【([^」]+?校验)规则包」/g, "规则包「$1规则包」")
      .replace(/「【([^」]+?校验)」/g, "「$1」");
    if (ruleType) {
      step.step = step.step
        .replace(/新增规则包「[^」]*?校验规则包」/g, `新增规则包「${ruleType}规则包」`)
        .replace(/选择「[^」]*?校验」/g, `选择「${ruleType}」`);
      step.expected = step.expected
        .replace(/规则包「[^」]*?校验规则包」/g, `规则包「${ruleType}规则包」`)
        .replace(/「[^」]*?校验」规则/g, `「${ruleType}」规则`);
    }
    if (step.step !== beforeStep || step.expected !== beforeExpected) stats.placeholderRepaired += 1;
  }
}

function normalizeCase(context, testCase) {
  context.currentTitle = testCase.title;
  testCase.preconditions = enrichLoginPrecondition(testCase.preconditions, context);
  testCase.steps = testCase.steps.map((step) => ({
    step: normalizeNavigation(decodeText(step.step)),
    expected: normalizeNavigation(decodeText(step.expected)),
  }));

  for (const step of testCase.steps) replaceUiCheck(step);
  fillEmptySteps(context, testCase);
  alignDataSourceAndDatabase(context, testCase);

  if (isLegacyRuleTask(testCase) && isDataQualityCase(context, testCase)) {
    rewriteLegacyRuleTask(context, testCase);
  } else if (isRuleTaskRelated(context, testCase) && !hasRuleSetChain(testCase)) {
    addRuleTaskBusinessChainPrecondition(testCase);
  }
  cleanupRuleTaskBusinessChain(context, testCase);

  for (const step of testCase.steps) {
    if (/在规则任务中引用该规则集并执行校验任务/.test(step.step)) {
      step.step = "进入【数据质量 → 规则任务管理】页面，点击【新建监控规则】，选择与规则集一致的数据源、数据库、数据表；在 Step 2 通过【导入规则包】引用该规则集，保存后点击【立即执行】，再进入【校验结果查询】打开最新实例详情";
      stats.runDetailExpanded += 1;
    }
    if (/新增任一规则任务/.test(step.step)) {
      step.step = step.step.replace(
        /新增任一规则任务/,
        "先在【规则集管理】创建规则集与规则包，再在【规则任务管理】通过【导入规则包】新增对应规则任务",
      );
      stats.ruleTaskBusinessChain += 1;
    }
  }

  expandRunDetailSteps(testCase);
  expandDownloadSteps(testCase);
  repairGeneratedPlaceholders(context, testCase);
}

function parseArchive(source) {
  const lines = source.split(/\n/);
  const frontmatter = [];
  let index = 0;
  if (lines[0]?.trim() === "---") {
    frontmatter.push(lines[index++]);
    while (index < lines.length) {
      frontmatter.push(lines[index]);
      if (lines[index]?.trim() === "---") {
        index += 1;
        break;
      }
      index += 1;
    }
  }

  const versions = [];
  let currentVersion = null;
  let currentSection = null;

  function ensureVersion(title) {
    currentVersion = { title, sections: [] };
    versions.push(currentVersion);
    currentSection = null;
  }

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const versionMatch = line.match(/^##\s+(.+?)\s*$/);
    if (versionMatch) {
      ensureVersion(versionMatch[1]);
      index += 1;
      continue;
    }

    const sectionMatch = line.match(/^###\s+(.+?)\s*$/);
    if (sectionMatch && currentVersion) {
      currentSection = { title: sectionMatch[1], cases: [] };
      currentVersion.sections.push(currentSection);
      index += 1;
      continue;
    }

    const caseMatch = line.match(/^#####\s+/);
    if (caseMatch && currentVersion && currentSection) {
      const start = index;
      index += 1;
      while (index < lines.length && !/^(##|###|#####)\s+/.test(lines[index] ?? "")) index += 1;
      currentSection.cases.push(extractCaseBlock(lines.slice(start, index).join("\n")));
      continue;
    }

    index += 1;
  }

  return { frontmatter, versions };
}

function renderArchive(archive) {
  const lines = [...archive.frontmatter, ""];
  for (const version of archive.versions) {
    lines.push(`## ${version.title}`, "");
    for (const section of version.sections) {
      lines.push(`### ${section.title}`, "");
      for (const testCase of section.cases) {
        lines.push(renderCase(testCase).trimEnd(), "");
      }
    }
  }
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

const source = readFileSync(archivePath, "utf8");
const archive = parseArchive(source);

for (const version of archive.versions) {
  for (const section of version.sections) {
    for (const testCase of section.cases) {
      stats.cases += 1;
      normalizeCase({ version: version.title, section: section.title }, testCase);
    }
  }
}

let output = renderArchive(archive);
output = output.replace(/case_count:\s*"?\d+"?/u, `case_count: ${stats.cases}`);

const issues = [];
if (stats.cases !== EXPECTED_CASES) issues.push(`case count ${stats.cases} != ${EXPECTED_CASES}`);
for (const [pattern, label] of [
  [/进入数据质量-规则任务管理-单表校验规则/u, "legacy rule task path"],
  [/点击添加规则-/u, "legacy add rule wording"],
  [/\bUI CHECK\b|\bDATA CHECK\b/u, "placeholder check wording"],
  [/^\s*无\s*$/mu, "empty standalone precondition/content"],
]) {
  if (pattern.test(output)) issues.push(label);
}

if (issues.length > 0) {
  throw new Error(`archive rewrite validation failed: ${issues.join("; ")}`);
}

writeFileSync(archivePath, output);
console.log(JSON.stringify({ output: archivePath, stats }, null, 2));
