#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OLD_RULESET_VERSIONS = new Set(["v6.4.2", "v6.4.3", "v6.4.4", "v6.4.5", "v6.4.6"]);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const archivePath = resolve(featureDir, "岚图已上线需求主流程用例.md");

const genericChainPattern =
  /\n?业务链路要求：与本用例相关的规则任务需先在【数据质量 → 规则集管理】按数据表创建规则集和规则包，再在【数据质量 → 规则任务管理】通过【导入规则包】引用生成；前置中提到的已存在规则任务均指该链路下已保存且可执行的规则任务。/g;
const postV648RuleSetChain =
  "-- v6.4.8+ 规则任务准备链路：已在【数据质量 → 规则集管理】按同一数据源、数据库和数据表创建规则集及规则包；在【数据质量 → 规则任务管理】通过「导入规则包」引用后保存任务。";

function normalizeSchemaPlaceholders(text) {
  return String(text ?? "")
    .replace(/quality_test_db\./g, "${SchemaA}.")
    .replace(/qa_test\./g, "${SchemaA}.")
    .replace(/hive_test_db\./g, "${SchemaA}.")
    .replace(/数据库[「"]?quality_test_db[」"]?/g, "数据库「${SchemaA}」")
    .replace(/数据库[「"]?qa_test[」"]?/g, "数据库「${SchemaA}」")
    .replace(/数据库[「"]?hive_test_db[」"]?/g, "数据库「${SchemaA}」")
    .replace(/quality_test_db/g, "${SchemaA}")
    .replace(/qa_test/g, "${SchemaA}")
    .replace(/hive_test_db/g, "${SchemaA}");
}

function normalizePreconditionContent(raw) {
  let content = normalizeSchemaPlaceholders(String(raw ?? "").replace(/\r\n?/g, "\n").trim());
  content = content.replace(genericChainPattern, "").trim();

  const hasComment = /^\/\*/.test(content);
  const header = hasComment
    ? ""
    : `/*
1. 环境：ltqc-local，base_url=http://shuzhan63-test-ltqc.k8s.dtstack.cn/dataAssets，租户 pw_test，质量项目 pw_test(id=92)。
2. 数据源：默认使用 SparkThrift2.x；数据库/Schema 统一使用 \${SchemaA} 占位，按环境映射到 ltqc-local 的 pw_test。
3. 目的：准备本用例依赖的数据、规则或页面状态；原始非 SQL 前置说明已转为 SQL 注释，避免与可执行 SQL 混排。
*/
`;

  const lines = content.split("\n");
  const normalized = [];
  let inBlockComment = false;
  let inCreateTable = false;
  const sqlStart =
    /^(USE|DROP|CREATE|INSERT|SELECT|SHOW|ALTER|DELETE|UPDATE|TRUNCATE|WITH|MSCK|DESCRIBE|DESC|SET|VALUES|FROM|WHERE|AND|OR|GROUP BY|ORDER BY|HAVING|UNION|COMMENT|PARTITIONED BY|STORED AS|TBLPROPERTIES|USING|ROW FORMAT|LOCATION|LOAD DATA)\b/i;
  const tupleOrSqlContinuation =
    /^(\(|\)|,|;|`|[A-Za-z_][A-Za-z0-9_]*\s+(STRING|VARCHAR|CHAR|INT|INTEGER|BIGINT|DOUBLE|DECIMAL|BOOLEAN|DATE|TIMESTAMP|JSON|ARRAY|MAP|STRUCT)\b|[A-Za-z_][A-Za-z0-9_]*\s+.*[,)]$)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      normalized.push("");
      continue;
    }

    if (trimmed.startsWith("/*")) inBlockComment = true;
    if (inBlockComment) {
      normalized.push(line);
      if (trimmed.endsWith("*/")) inBlockComment = false;
      continue;
    }

    if (/^CREATE\s+(?:TABLE|VIEW)/i.test(trimmed)) inCreateTable = true;
    const keepAsSql =
      trimmed.startsWith("--") ||
      sqlStart.test(trimmed) ||
      tupleOrSqlContinuation.test(trimmed) ||
      (inCreateTable && !/^[\u4e00-\u9fa5\d]+[)、.．]/.test(trimmed));

    normalized.push(keepAsSql ? line : `-- ${trimmed}`);
    if (inCreateTable && /;\s*$/.test(trimmed)) inCreateTable = false;
  }

  let body = normalized.join("\n").trim();
  if (!/^USE\s+\$\{SchemaA\}/im.test(body)) {
    body = `USE \${SchemaA};\n\n${body}`;
  }
  if (!/--\s*预期结果：\s*\d+/.test(body)) {
    body = `${body}\n\nSELECT 1 AS precondition_ready; -- 预期结果：1`;
  }

  return `${header}${body}`.trim();
}

function normalizeSharedUiText(block) {
  return block
    .replace(/进入【数据资产】[-－—]【数据质量】[-－—]【规则集管理】页面/g, "进入【数据质量 → 规则集管理】页面")
    .replace(/进入【资产 → 数据质量 → 规则集管理 → 基础信息】页面/g, "进入【数据质量 → 规则集管理】页面，进入「基础信息」步骤")
    .replace(/进入【资产 → 数据质量 → 规则集管理 → 监控规则】页面/g, "进入【数据质量 → 规则集管理】页面，进入「监控规则」步骤")
    .replace(
      /进入【资产 → 数据质量 → 规则任务管理 → 监控对象】页面/g,
      "进入【数据质量 → 规则任务管理】页面，点击「新建监控规则」，进入「新建单表校验规则」的「监控对象」步骤",
    )
    .replace(
      /进入【规则任务管理 → 监控对象】页面/g,
      "进入【数据质量 → 规则任务管理】页面，点击「新建监控规则」，进入「新建单表校验规则」的「监控对象」步骤",
    )
    .replace(/进入【数据资产】[-－—]【数据质量】[-－—]【规则任务管理】页面/g, "进入【数据质量 → 规则任务管理】页面")
    .replace(/进入【数据资产】[-－—]【数据质量】[-－—]【校验结果查询】页面/g, "进入【数据质量 → 校验结果查询】页面")
    .replace(/进入【校验结果查询】/g, "进入【数据质量 → 校验结果查询】页面")
    .replace(/进入【规则任务管理】/g, "进入【数据质量 → 规则任务管理】页面")
    .replace(
      /进入【数据质量 → 规则任务管理 → 监控对象】页面/g,
      "进入【数据质量 → 规则任务管理】页面，点击「新建监控规则」，进入「新建单表校验规则」的「监控对象」步骤",
    )
    .replace(/新增并立即执行/g, "保存后在规则详情抽屉点击「立即执行」")
    .replace(/保存并立即执行/g, "保存后在规则详情抽屉点击「立即执行」")
    .replace(
      /在任务列表点击【立即执行】/g,
      "在规则任务列表点击目标表名打开规则详情抽屉，并在「规则管理」区域点击「立即执行」",
    )
    .replace(
      /点击任务「([^」]+)」的【立即执行】/g,
      "在【数据质量 → 规则任务管理】列表点击「$1」所在表名打开规则详情抽屉，在抽屉「规则管理」区域点击「立即执行」",
    )
    .replace(
      /找到「([^」]+)」，点击【立即执行】按钮/g,
      "找到「$1」对应任务，点击表名打开规则详情抽屉，在抽屉「规则管理」区域点击「立即执行」",
    )
    .replace(
      /找到"([^"]+)"，点击【立即执行】/g,
      '找到"$1"对应任务，点击表名打开规则详情抽屉，在抽屉「规则管理」区域点击「立即执行」',
    )
    .replace(
      /点击任务【立即执行】/g,
      "在规则任务列表点击目标表名打开规则详情抽屉，并在抽屉「规则管理」区域点击「立即执行」",
    )
    .replace(
      /点击【立即执行】/g,
      "在当前规则详情抽屉「规则管理」区域点击「立即执行」",
    )
    .replace(
      /点击【立即执行】按钮/g,
      "在当前规则详情抽屉「规则管理」区域点击「立即执行」按钮",
    )
    .replace(
      /找到「([^」]+)」最新实例记录并打开实例详情/g,
      "使用「请输入表名/任务名称搜索」搜索「$1」，打开最新实例详情",
    )
    .replace(/页面正常打开，列表加载完成/g, "页面标题、筛选区和列表主区域可见，列表请求返回后展示数据或空态")
    .replace(/页面正常加载，列表加载完成/g, "页面标题、筛选区和列表主区域可见，列表请求返回后展示数据或空态")
    .replace(/页面正常打开/g, "页面标题、筛选区或主内容区域可见")
    .replace(/页面正常加载/g, "页面标题、筛选区或主内容区域可见")
    .replace(/页面正常进入/g, "页面标题、筛选区或主内容区域可见")
    .replace(
      /规则任务管理页面标题、筛选区或主内容区域可见，列表加载完成/g,
      "规则任务管理页面展示「新建监控规则」「开启检测」「关闭检测」和任务列表列头",
    )
    .replace(
      /校验结果查询页面标题、筛选区或主内容区域可见，列表加载完成/g,
      "校验结果查询页面展示「请输入表名/任务名称搜索」「开始日期」「结束日期」和实例列表列头",
    )
    .replace(/数据质量报告页面正常加载/g, "数据质量报告页面标题和报告列表主区域可见");
}

function normalizeOldVersionRuleTaskFlow(block) {
  return block
    .replace(/【数据质量 → 规则集管理】/g, "【数据质量 → 规则任务管理】")
    .replace(/规则集管理/g, "规则任务管理")
    .replace(/新建规则集/g, "新建监控规则")
    .replace(/新增规则集/g, "新增监控规则")
    .replace(/编辑规则集/g, "编辑监控规则")
    .replace(/规则集列表/g, "规则任务列表")
    .replace(/规则集创建/g, "规则任务创建")
    .replace(/规则集保存/g, "规则任务保存")
    .replace(/规则集详情/g, "规则任务详情")
    .replace(/规则集描述/g, "规则描述")
    .replace(/规则集「([^」]+)」和规则包「([^」]+)」/g, "已保存的监控规则配置「$1 / $2」")
    .replace(/规则集"([^"]+)"的"([^"]+)"/g, '已保存的监控规则配置"$1 / $2"')
    .replace(/通过【导入规则包】导入[^；，。<|]+/g, "在「监控规则」步骤直接添加本用例要求的规则")
    .replace(/点击【导入规则包】[^，。<|]+/g, "在「监控规则」步骤直接添加本用例要求的规则")
    .replace(/导入规则包/g, "添加规则")
    .replace(/规则包名称/g, "规则名称")
    .replace(/规则包数量/g, "规则数量")
    .replace(/规则包「([^」]+)」/g, "规则配置「$1」")
    .replace(/规则包"([^"]+)"/g, '规则配置"$1"')
    .replace(/规则包/g, "规则配置")
    .replace(/规则与前置的「[^」]+」/g, "规则与本用例配置内容")
    .replace(/规则与前置的"[^"]+"/g, "规则与本用例配置内容");
}

function shouldEnsurePostV648RuleSetFlow(block, version) {
  if (OLD_RULESET_VERSIONS.has(version)) return false;
  const text = block.replace(/<br\s*\/?>/gi, "\n");
  if (/菜单名称|页面菜单/.test(text)) return false;
  if (!/规则任务管理|监控规则|校验结果查询|数据质量报告/.test(text)) return false;
  return /新建监控规则|立即执行|任务运行|任务正常运行|实例详情|脏数据|校验结果|分区信息改变/.test(text);
}

function ensurePostV648RuleSetFlow(block, version) {
  if (!shouldEnsurePostV648RuleSetFlow(block, version)) return block;
  if (/规则集管理[\s\S]{0,120}规则包|规则包[\s\S]{0,120}规则集管理/.test(block)) return block;

  return block.replace(
    /(```sql\n[\s\S]*?)(\nSELECT 1 AS precondition_ready; -- 预期结果：1\n```)/,
    `$1\n\n${postV648RuleSetChain}$2`,
  );
}

function normalizeBlockByVersion(block, version) {
  let next = block.replace(
    /```sql\n([\s\S]*?)\n```/g,
    (_match, content) => `\`\`\`sql\n${normalizePreconditionContent(content)}\n\`\`\``,
  );
  next = normalizeSchemaPlaceholders(next).replace(genericChainPattern, "");
  next = normalizeSharedUiText(next);
  if (OLD_RULESET_VERSIONS.has(version)) {
    next = normalizeOldVersionRuleTaskFlow(next);
  } else {
    next = ensurePostV648RuleSetFlow(next, version);
  }
  return next;
}

function normalizeArchive(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let version = "";
  const output = [];
  let currentCase = [];

  const flushCase = () => {
    if (!currentCase.length) return;
    output.push(normalizeBlockByVersion(currentCase.join("\n"), version));
    currentCase = [];
  };

  for (const line of lines) {
    const versionMatch = line.match(/^##\s+(v6\.4\.\d+)\s*$/);
    if (versionMatch) {
      flushCase();
      version = versionMatch[1];
      output.push(line);
      continue;
    }

    if (/^#####\s+【P[0-3]】/.test(line)) {
      flushCase();
      currentCase = [line];
      continue;
    }

    if (currentCase.length) {
      currentCase.push(line);
    } else {
      output.push(line);
    }
  }
  flushCase();

  return output
    .join("\n")
    .replace(/\|\n#####/g, "|\n\n#####")
    .replace(/\n{4,}/g, "\n\n\n");
}

const original = readFileSync(archivePath, "utf8");
const updated = normalizeArchive(original);
writeFileSync(archivePath, updated.endsWith("\n") ? updated : `${updated}\n`);

console.log(JSON.stringify({ archive: archivePath, changed: original !== updated }));
