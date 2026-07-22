import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { getEnvConfig } from "../../../../../../_shared/helpers";
import {
  CASE_01_SPEC,
  EXPLICIT_RULE_CASE_SPECS,
  EXPECTED_CANONICAL_RULE_COUNTS,
  PRECONDITION_RULE_DONOR_CASES,
  explicitRuleCaseNumbers,
  loadV6411SourcePreconditionAudits,
  loadV6411UiCaseMetas,
  loadV6411SourceRuleAudits,
  ruleFingerprint,
  type V6411RuleSpec,
  type V6411UiCaseSpec,
} from "../data/v6411-ui-case-specs";
import {
  baseTableProfileForV6411Case,
  baseRowsForV6411Case,
  sourceDefaultRows,
  validityDetailUnpassRows,
  type V6411BaseTableRow,
} from "../data/v6411-ui-base-table-data";
import {
  descendingActionCaseNumbers,
  descendingDisplayCaseNumbers,
  expectedRuleOutcomes,
} from "../data/v6411-result-oracle";

const CASES_DIR = path.dirname(fileURLToPath(import.meta.url));
const FORMAL_UI_SCRIPT_FILES = [path.join(CASES_DIR, "t16-ui-rebuild-v6411-cases.ts")];

function resolveAuditDorisName(): string {
  try {
    const datasource = getEnvConfig().datasources.doris;
    return datasource?.assets?.name ?? datasource?.batch?.name ?? "__unconfigured_doris__";
  } catch {
    return "__unresolved_doris__";
  }
}

function resolveAuditSparkName(): string {
  try {
    return getEnvConfig().datasources.sparkthrift?.batch?.name ?? "__unconfigured_sparkthrift__";
  } catch {
    return "__unresolved_sparkthrift__";
  }
}

test.describe("v6411 UI 自动化规格审计", () => {
  test("业务操作顺序、最终显示顺序和规则预期 oracle 必须完整", async () => {
    const allCases = Array.from({ length: 72 }, (_, index) => index + 1);
    expect(descendingActionCaseNumbers(allCases)).toEqual([...allCases].reverse());
    expect(descendingDisplayCaseNumbers(allCases)).toEqual(allCases);
    for (const caseNo of allCases) {
      const outcomes = expectedRuleOutcomes(caseNo);
      const spec = EXPLICIT_RULE_CASE_SPECS.find((item) => item.caseNo === caseNo);
      expect(outcomes, `§${padCaseNo(caseNo)} 必须逐条生成规则预期`).toHaveLength(spec?.expectedRuleCount ?? 0);
      expect(outcomes.every((item) => item.functionName && item.outcome), `§${padCaseNo(caseNo)} 规则预期不得为空`).toBe(true);
    }
  });

  test("72 条 UI 用例元数据必须来自 canonical 36 条 CSV 用例并按 Doris/Spark 各复制一套", async () => {
    const cases = loadV6411UiCaseMetas();
    expect(cases, "必须生成 72 条 UI 用例元数据").toHaveLength(72);

    const selectedCases = parseCaseFilter(process.env.V6411_UI_REBUILD_CASES ?? "1-72");
    const dorisName = resolveAuditDorisName();
    const sparkName = resolveAuditSparkName();
    if ([...selectedCases].some((caseNo) => caseNo <= 36)) {
      expect(cases.slice(0, 36).every((item) => item.datasourceName === dorisName), "§01-§36 必须使用环境配置的 Doris 数据源").toBe(true);
    }
    if ([...selectedCases].some((caseNo) => caseNo >= 37)) {
      expect(cases.slice(36).every((item) => item.datasourceName === sparkName), "§37-§72 必须使用环境配置的 SparkThrift 数据源").toBe(true);
    }

    for (const item of cases) {
      expect(item.shortRuleName.length, `§${item.caseNo} 规则名称必须不超过 UI 限制 50 字`).toBeLessThanOrEqual(50);
      expect(item.shortRuleName, `§${item.caseNo} 规则名称不得保留中文书名号`).not.toMatch(/[「」【】]/);
      expect(item.packageName, `§${item.caseNo} 必须从源用例提取规则包名称`).not.toBe("");
      expect(item.packageName.length, `§${item.caseNo} 规则包名称必须不超过 UI 限制 50 字`).toBeLessThanOrEqual(50);
      expect(item.packageCount, `§${item.caseNo} 规则拼接包必须为正整数`).toBeGreaterThan(0);
      expect(item.fullTitle, `§${item.caseNo} 任务名必须来自用例标题`).toMatch(/^验证/);
    }

    expect(
      cases
        .filter((item) => item.packageCount !== 1)
        .map((item) => [item.caseNo, item.packageCount]),
      "非 1 规则拼接包用例必须与 CSV 保持一致",
    ).toEqual([
      [1, 10],
      [3, 10],
      [11, 4],
      [37, 10],
      [39, 10],
      [47, 4],
    ]);

    expect(cases.find((item) => item.caseNo === 1)?.monitorRuleCount, "§01 必须按 canonical CSV 创建 21 条规则").toBe(
      21,
    );
    expect(cases.find((item) => item.caseNo === 1)?.sourceCaseId, "§01 必须来自 CSV 用例编号 185972").toBe("185972");
    expect(cases.find((item) => item.caseNo === 1)?.shortRuleName, "§01 UI 提交名称必须按 50 字规则归一化").toBe(
      "§01 验证可合并和不可合并-抽样开启-设置分区-不同过滤条件-包含强弱规则-多规则包校验功能",
    );
    expect(
      cases.find((item) => item.caseNo === 37)?.monitorRuleCount,
      "§37 Spark 镜像用例也必须按 canonical CSV 创建 21 条规则",
    ).toBe(21);
  });

  test("72 条源用例规则数量和重复规则指纹必须在进入 UI 前审计通过", async () => {
    const audits = loadV6411SourceRuleAudits();
    expect(audits, "必须生成 72 条源规则审计记录").toHaveLength(72);

    for (const audit of audits) {
      const expectedRuleCount = EXPECTED_CANONICAL_RULE_COUNTS[(audit.caseNo - 1) % 36];
      expect(
        audit.ruleCount,
        `§${padCaseNo(audit.caseNo)} 必须按 CSV 用例 ${audit.sourceCaseId} 创建 ${expectedRuleCount} 条监控规则`,
      ).toBe(expectedRuleCount);
      expect(
        audit.duplicateFingerprints,
        `§${padCaseNo(audit.caseNo)} 不允许存在重复规则指纹；规则包=${audit.packageName}`,
      ).toEqual([]);
      expect(audit.packageName, `§${padCaseNo(audit.caseNo)} 必须有规则包名称或前置规则包`).not.toBe("");
      expect(audit.packageCount, `§${padCaseNo(audit.caseNo)} 规则拼接包必须为正整数`).toBeGreaterThan(0);

      if (expectedRuleCount === 0) {
        expect(
          audit.fullTitle,
          `§${padCaseNo(audit.caseNo)} 无新增规则明细时必须是依赖前置规则的明细或报告类用例`,
        ).toMatch(/查看明细|质量报告/);
      } else {
        for (const rule of audit.rules) {
          expect(rule.category, `§${padCaseNo(audit.caseNo)} 监控规则${rule.index} 必须能识别规则类型`).not.toBe("");
          expect(rule.functionName, `§${padCaseNo(audit.caseNo)} 监控规则${rule.index} 必须能识别统计函数`).not.toBe("");
          expect(
            rule.filter ?? "",
            `§${padCaseNo(audit.caseNo)} 监控规则${rule.index} 过滤条件必须是可提交执行的 SQL 表达式，不得保留中文逻辑词`,
          ).not.toMatch(/[且或]/);
        }
      }
    }
  });

  test("显式实现的规则包规格必须数量正确且无重复规则", async () => {
    const metasByCaseNo = new Map(loadV6411UiCaseMetas().map((item) => [item.caseNo, item]));
    const sourceAuditsByCaseNo = new Map(loadV6411SourceRuleAudits().map((item) => [item.caseNo, item]));

    for (const spec of EXPLICIT_RULE_CASE_SPECS) {
      const meta = metasByCaseNo.get(spec.caseNo);
      const sourceAudit = sourceAuditsByCaseNo.get(spec.caseNo);

      expect(meta, `§${padCaseNo(spec.caseNo)} 必须有 CSV meta`).toBeTruthy();
      expect(sourceAudit, `§${padCaseNo(spec.caseNo)} 必须有源用例审计记录`).toBeTruthy();
      expect(spec.packageName, `§${padCaseNo(spec.caseNo)} 规则包名称必须与 CSV meta 一致`).toBe(
        meta?.packageName,
      );
      expect(spec.packageName, `§${padCaseNo(spec.caseNo)} 规则包名称必须与源用例审计一致`).toBe(
        sourceAudit?.packageName,
      );
      expect(spec.packageCount, `§${padCaseNo(spec.caseNo)} 规则拼接包数量必须与 CSV meta 一致`).toBe(
        meta?.packageCount,
      );
      expect(spec.packageCount, `§${padCaseNo(spec.caseNo)} 规则拼接包数量必须与源用例审计一致`).toBe(
        sourceAudit?.packageCount,
      );
      expect(spec.rules, `§${padCaseNo(spec.caseNo)} 必须按 CSV 创建 ${spec.expectedRuleCount} 条监控规则`).toHaveLength(
        spec.expectedRuleCount,
      );

      const fingerprints = spec.rules.map(ruleFingerprint);
      const duplicateFingerprints = fingerprints.filter((item, index) => fingerprints.indexOf(item) !== index);
      expect(duplicateFingerprints, `§${padCaseNo(spec.caseNo)} 不允许出现重复规则指纹`).toEqual([]);
      for (const rule of spec.rules) {
        expect(
          rule.filter ?? "",
          `§${padCaseNo(spec.caseNo)} 显式规则 ${rule.index} 过滤条件必须是可提交执行的 SQL 表达式，不得保留中文逻辑词`,
        ).not.toMatch(/[且或]/);
      }
    }

    expect(
      CASE_01_SPEC.rules.some(
        (rule) =>
          rule.category === "有效性校验" &&
          rule.fields?.join(",") === "money" &&
          rule.functionName === "字符串长度" &&
          rule.expected === ">=2" &&
          rule.strength === "强规则",
      ),
      "§01 必须包含 CSV 中的 money 字符串长度 >=2 强规则",
    ).toBe(true);
    expect(CASE_01_SPEC.packageCount, "§01 必须按 CSV 设置规则拼接包为 10").toBe(10);
    expect(
      EXPLICIT_RULE_CASE_SPECS.filter((item) => item.packageCount !== 1).map((item) => [item.caseNo, item.packageCount]),
      "显式执行规格中的非 1 规则拼接包用例必须与 CSV 保持一致",
    ).toEqual([
      [1, 10],
      [3, 10],
      [11, 4],
      [37, 10],
      [39, 10],
      [47, 4],
    ]);
  });

  test("一致性和多表对比类规则必须使用独立对比表，不能复用源表", async () => {
    const compareRuleNames = ["多表唯一性判断", "多表数据行数对比", "多表数据一致性比对"];
    const compareSpecs = EXPLICIT_RULE_CASE_SPECS.filter((spec) =>
      spec.rules.some((rule) => compareRuleNames.includes(rule.functionName)),
    );
    const consistencySpecs = EXPLICIT_RULE_CASE_SPECS.filter((spec) =>
      spec.rules.some((rule) => rule.functionName === "多表数据一致性比对"),
    );
    expect(compareSpecs.length, "必须识别到需要对比表的 UI 用例").toBeGreaterThan(0);
    expect(consistencySpecs.length, "必须识别到一致性校验 UI 用例").toBeGreaterThan(0);

    const rebuildScript = fs.readFileSync(path.join(CASES_DIR, "t16-ui-rebuild-v6411-cases.ts"), "utf8");
    expect(rebuildScript, "重建脚本必须生成 _cmp 独立对比表名").toContain("compareTableNameForCase");
    expect(rebuildScript, "非人工元数据前置模式必须支持同步独立对比表元数据").toContain(
      "syncMetadata(page, build.datasourceName, build.database, build.compareTableName",
    );
    expect(rebuildScript, "人工建表开关必须同时记录人工元数据前置，不得隐式执行同步").toContain(
      "metadata-manual-precondition",
    );
    expect(rebuildScript, "一致性校验必须选择独立对比表").toContain(
      "configureConsistencyCompareTable(root, build.compareTableName",
    );
    expect(rebuildScript, "一致性校验不得把源表作为对比表").not.toContain(
      "configureConsistencyCompareTable(root, build.tableName",
    );
    expect(rebuildScript, "多表唯一性不得把源表作为对比表").not.toContain(
      "configureCompareTableRow(root, build.tableName",
    );
    expect(rebuildScript, "多表行数对比不得把源表作为对比表").not.toContain(
      "configureTableRowCountCompare(root, build.database, build.tableName",
    );
  });

  test("任务级抽样和分区设置必须来自源用例或前置 donor", async () => {
    const specs = new Map(EXPLICIT_RULE_CASE_SPECS.map((spec) => [spec.caseNo, spec]));
    const donorByCaseNo = new Map<number, number>(PRECONDITION_RULE_DONOR_CASES.map((item) => [item.caseNo, item.donorCaseNo]));

    for (const spec of EXPLICIT_RULE_CASE_SPECS) {
      const donorCaseNo = donorByCaseNo.get(spec.caseNo);
      if (donorCaseNo) {
        const donor = specs.get(donorCaseNo);
        expect(donor, `§${padCaseNo(spec.caseNo)} 的 donor §${padCaseNo(donorCaseNo)} 必须存在`).toBeTruthy();
        expect(spec.samplingEnabled, `§${padCaseNo(spec.caseNo)} 抽样设置必须继承 donor`).toBe(
          donor?.samplingEnabled,
        );
        expect(spec.partitionEnabled, `§${padCaseNo(spec.caseNo)} 分区设置必须继承 donor`).toBe(
          donor?.partitionEnabled,
        );
        continue;
      }

      expect(spec.samplingEnabled, `§${padCaseNo(spec.caseNo)} 抽样设置必须来自标题`).toBe(
        spec.title.includes("抽样开启"),
      );
      expect(spec.partitionEnabled, `§${padCaseNo(spec.caseNo)} 分区设置必须来自标题`).toBe(
        spec.title.includes("设置分区"),
      );
    }

    expect(specs.get(1)?.samplingEnabled, "§01 必须抽样开启").toBe(true);
    expect(specs.get(1)?.partitionEnabled, "§01 必须设置分区").toBe(true);
    expect(specs.get(7)?.samplingEnabled, "§07 必须抽样关闭").toBe(false);
    expect(specs.get(7)?.partitionEnabled, "§07 不应设置分区").toBe(false);
    expect(specs.get(31)?.samplingEnabled, "§31 必须抽样关闭").toBe(false);
    expect(specs.get(31)?.partitionEnabled, "§31 不应设置分区").toBe(false);
  });

  test("前置规则类用例必须显式绑定 donor 规则明细", async () => {
    const specs = new Map(EXPLICIT_RULE_CASE_SPECS.map((spec) => [spec.caseNo, spec]));

    for (const mapping of PRECONDITION_RULE_DONOR_CASES) {
      const spec = specs.get(mapping.caseNo);
      const donor = specs.get(mapping.donorCaseNo);
      expect(spec, `§${padCaseNo(mapping.caseNo)} 必须有前置规则派生规格`).toBeTruthy();
      expect(donor, `§${padCaseNo(mapping.caseNo)} 的 donor §${padCaseNo(mapping.donorCaseNo)} 必须有显式规格`).toBeTruthy();
      expect(spec?.packageName, `§${padCaseNo(mapping.caseNo)} 规则包名必须来自前置条件`).toBe(
        mapping.packageName,
      );
      expect(
        spec?.rules.map(ruleFingerprint),
        `§${padCaseNo(mapping.caseNo)} 必须复用 donor §${padCaseNo(mapping.donorCaseNo)} 的规则指纹`,
      ).toEqual(donor?.rules.map(ruleFingerprint));
    }
  });

  test("选中的 UI 重建用例必须已经显式实现规则明细", async () => {
    const selectedCases = parseCaseFilter(process.env.V6411_UI_REBUILD_CASES ?? "1-72");
    const implemented = new Set(explicitRuleCaseNumbers());
    const missing = [...selectedCases].filter((caseNo) => !implemented.has(caseNo));
    expect(
      missing,
      `以下用例尚未显式实现规则明细，不能进入 UI 创建流程: ${missing.map((caseNo) => `§${padCaseNo(caseNo)}`).join(", ")}`,
    ).toEqual([]);
  });

  test("正式 UI 脚本不得用后端 API 替代页面业务动作", async () => {
    const forbiddenPatterns = [
      /\bpage\.request\b/,
      /\brequest\.newContext\b/,
      /\bfetch\s*\(/,
      /\baxios\b/,
      /\bsuperagent\b/,
      /\$\.ajax\b/,
      /\.waitForResponse\s*\(/,
      /\.request\(\)\.postData/,
      /\/api\/dq\//i,
      /\/api\/.*(?:rule|ruleset|monitor|quality|task)/i,
    ];

    for (const file of FORMAL_UI_SCRIPT_FILES) {
      const text = fs.readFileSync(file, "utf8");
      const violations = forbiddenPatterns
        .filter((pattern) => pattern.test(text))
        .map((pattern) => pattern.toString());
      expect(
        violations,
        `${path.basename(file)} 不能出现后端 API/HTTP 客户端替代 UI 创建、编辑、保存、引入、立即执行、状态查询`,
      ).toEqual([]);
    }

    const rebuildSource = fs.readFileSync(path.join(CASES_DIR, "t16-ui-rebuild-v6411-cases.ts"), "utf8");
    expect(rebuildSource, "任务创建必须按审计规格控制分区设置，不能无条件设置已有分区").toContain(
      "await configurePartition(page, build, tablePartitionDate(), sourceRef);",
    );
    expect(rebuildSource, "任务创建必须按审计规格控制抽样开关，不能无条件开启抽样").toContain(
      "await configureSampling(page, build, sourceRef);",
    );
    expect(rebuildSource, "正式 full runner 必须通过统一函数解析用例过滤范围").toContain(
      "parseCaseFilter(resolveCaseFilterValue())",
    );
    expect(rebuildSource, "正式 full runner 默认必须覆盖 72 条").toContain('return "1-72";');
    expect(rebuildSource, "一致性问题修复只允许通过显式环境变量收窄用例范围").toContain(
      'process.env.V6411_UI_REBUILD_CONSISTENCY_ONLY === "1"',
    );
    const classifySource = rebuildSource.slice(
      rebuildSource.indexOf("function classifyResult"),
      rebuildSource.indexOf("async function waitForSpin"),
    );
    expect(classifySource, "必须能定位 classifyResult 函数体").toContain("function classifyResult");
    const failureIndex = classifySource.indexOf('classification: "run-failed"');
    const passIndex = classifySource.indexOf('classification: "validation-pass"');
    const unpassIndex = classifySource.indexOf('classification: "validation-unpass"');
    expect(failureIndex, "结果分类必须包含运行失败/校验异常").toBeGreaterThanOrEqual(0);
    expect(passIndex, "结果分类必须包含校验通过").toBeGreaterThanOrEqual(0);
    expect(unpassIndex, "结果分类必须包含校验不通过").toBeGreaterThanOrEqual(0);
    expect(
      failureIndex,
      "结果行可能带 tooltip 中的校验通过/不通过统计，必须先识别校验异常/运行失败",
    ).toBeLessThan(Math.min(passIndex, unpassIndex));
    expect(rebuildSource, "禁止回退到无条件选择已有分区").not.toContain(
      "await configureExistingPartition(page, shanghaiDate(), sourceRef);",
    );
    expect(rebuildSource, "禁止回退到无条件配置抽样").not.toContain("await configureSampling(page, sourceRef);");
  });

  test("正式 UI 重建脚本必须使用环境项目、外部 Doris/Spark 底表和批次级随机表名", async () => {
    const rebuildSource = fs.readFileSync(path.join(CASES_DIR, "t16-ui-rebuild-v6411-cases.ts"), "utf8");

    expect(rebuildSource, "正式 UI 重建质量项目必须来自环境解析").toContain(
      "const PROJECT_ID = String(ENV.projects.quality.id);",
    );
    expect(rebuildSource, "正式 UI 重建质量项目名称必须来自环境解析").toContain(
      "const PROJECT_NAME = ENV.projects.quality.name;",
    );
    expect(rebuildSource, "Doris/SparkThrift 必须通过显式开关使用人工建表前置").toContain(
      "V6411_UI_SKIP_BASE_TABLE_CREATE",
    );
    expect(rebuildSource, "Doris/SparkThrift 人工前置时不得回退到底层建表").toContain(
      "Doris/SparkThrift 回归必须先手工执行对应 SQL",
    );
    expect(rebuildSource, "规则任务资源组必须支持环境变量配置").toContain("V6411_UI_RESOURCE_GROUP");
    expect(rebuildSource, "表分区必须支持与人工 SQL 一致的运行时日期").toContain("V6411_UI_TABLE_PARTITION");
    expect(rebuildSource, "本回归默认不得通过 V6411_UI_EXISTING_TABLES 复用旧业务记录").toContain(
      "V6411_UI_EXISTING_TABLES 仅允许与 V6411_UI_REUSE_EXISTING_RECORDS=1 一起使用；默认禁止复用旧业务记录。",
    );
    expect(rebuildSource, "必须提供批次级 8 位英文字母后缀").toContain("function resolveBatchTableSuffix()");
    expect(rebuildSource, "正式批量表名必须在同一次 run 目录内复用同一个批次后缀").toContain(
      "const BATCH_TABLE_SUFFIX = resolveBatchTableSuffix();",
    );
    expect(rebuildSource, "必须用 runKey 区分不同脚本执行批次").toContain("const BATCH_RUN_KEY = resolveBatchRunKey();");
    expect(rebuildSource, "显式 runKey 必须可覆盖，便于调试恢复同一批次").toContain("V6411_UI_REBUILD_RUN_KEY");
    expect(rebuildSource, "默认 runKey 必须包含 Playwright runner 父进程，第二次执行脚本时重新随机").toContain(
      "process.ppid",
    );
    expect(rebuildSource, "批次后缀必须持久化到文件，防止 Playwright worker 重启后换后缀").toContain(
      '.ui-rebuild-table-suffix',
    );
    expect(rebuildSource, "批次后缀文件必须记录 runKey，避免下一次执行复用旧后缀").toContain("runKey: BATCH_RUN_KEY");
    expect(rebuildSource, "批次后缀必须在 worker 重启后优先读取已持久化值").toContain(
      "fs.existsSync(BATCH_TABLE_SUFFIX_FILE)",
    );
    expect(rebuildSource, "输出初始化必须按 runKey 清理，避免第二次执行混入旧结果").toContain(
      "readOutputInitRunKey(OUTPUT_INIT_MARKER) !== BATCH_RUN_KEY",
    );
    expect(rebuildSource, "未指定 V6411_UI_TABLE_BATCH_SUFFIX 时必须重新随机生成批次后缀").toContain("Math.random()");
    expect(rebuildSource, "显式批次后缀也必须强制校验 8 位小写英文字母").toContain("/^[a-z]{8}$/.test(value)");
    expect(rebuildSource, "正式批次表名前缀必须显式来自源用例主表名").toContain(
      'const SOURCE_BASE_TABLE_NAME = "test_info_1";',
    );
    expect(rebuildSource, "正式批次表名必须是 test_info_1_<8位英文>_<两位用例序号>").toContain(
      "${SOURCE_BASE_TABLE_NAME}_${BATCH_TABLE_SUFFIX}_${padCaseNo(caseNo)}",
    );
    const uniqueNameStart = rebuildSource.indexOf("function uniqueTableName");
    const uniqueNameEnd = rebuildSource.indexOf("function tableNameForCase");
    expect(uniqueNameStart, "必须存在 uniqueTableName 函数").toBeGreaterThanOrEqual(0);
    expect(uniqueNameEnd, "必须存在 tableNameForCase 函数").toBeGreaterThan(uniqueNameStart);
    expect(
      rebuildSource.slice(uniqueNameStart, uniqueNameEnd),
      "正式批量表名生成不得继续使用时间戳/Date.now 生成每条不同随机串",
    ).not.toContain("Date.now()");
    expect(rebuildSource, "批量运行时 V6411_UI_TABLE_NAME 只能用于单条调试，避免 72 条共用同一表").toContain(
      "V6411_UI_TABLE_NAME 只允许单条调试时使用",
    );
    expect(rebuildSource, "单条调试表名也必须符合源表名+8位字母+两位用例序号").toContain(
      "V6411_UI_TABLE_NAME 必须符合",
    );
    expect(rebuildSource, "单条调试表名末尾序号必须匹配当前用例").toContain(
      "V6411_UI_TABLE_NAME 用例序号必须匹配当前",
    );

    const projectDefaultViolations = FORMAL_UI_SCRIPT_FILES.flatMap((file) => {
      const text = fs.readFileSync(file, "utf8");
      const violations: string[] = [];
      if (text.includes('process.env.V6411_DQ_PROJECT_ID ?? "157"')) violations.push(`${path.basename(file)}: project id 157`);
      if (text.includes('process.env.V6411_DQ_PROJECT_NAME ?? "pw"')) violations.push(`${path.basename(file)}: project name pw`);
      return violations;
    });
    expect(projectDefaultViolations, "正式 UI 脚本不能默认跑到旧质量项目 pw/157").toEqual([]);
  });

  test("72 条源用例前置 SQL 或 donor 规则与正式建表 helper 必须使用正确底表数据", async () => {
    const sourcePreconditions = loadV6411SourcePreconditionAudits();
    const defaultRows = sourceDefaultRows();
    const validityDetailCaseNos = new Set([16, 52]);
    const donorByCaseNo = new Map<number, number>(PRECONDITION_RULE_DONOR_CASES.map((item) => [item.caseNo, item.donorCaseNo]));
    expect(sourcePreconditions, "必须从 canonical CSV 生成 72 条前置 SQL 审计记录").toHaveLength(72);

    for (const source of sourcePreconditions) {
      expect(source.precondition, `§${padCaseNo(source.caseNo)} 必须有源用例前置条件`).not.toBe("");
      expect(
        source.fullTitle,
        `§${padCaseNo(source.caseNo)} 前置条件审计必须绑定到校验用例标题`,
      ).toMatch(/^验证/);
      if (sourcePreconditionHasBaseTableSql(source.precondition)) {
        assertSourcePreconditionUsesDefaultRows(source.caseNo, source.precondition, defaultRows);
      } else {
        const donorCaseNo = donorByCaseNo.get(source.caseNo);
        expect(
          donorCaseNo,
          `§${padCaseNo(source.caseNo)} 无独立建表 SQL 时必须显式绑定 donor 规则用例`,
        ).toBeTruthy();
        expect(
          baseRowsForV6411Case(requiredCaseSpec(donorCaseNo!)),
          `§${padCaseNo(source.caseNo)} donor §${padCaseNo(donorCaseNo!)} 的建表 helper 数据必须正确`,
        ).toEqual(defaultRows);
      }
      const spec = requiredCaseSpec(source.caseNo);
      const helperRows = baseRowsForV6411Case(spec);
      if (validityDetailCaseNos.has(source.caseNo)) {
        expect(
          baseTableProfileForV6411Case(spec),
          `§${padCaseNo(source.caseNo)} 有效性不通过查看明细用例必须使用 >100 脏数据 profile`,
        ).toBe("validity-detail-unpass-gt100");
        expect(helperRows, `§${padCaseNo(source.caseNo)} 必须固定生成 120 行有效性不通过明细数据`).toEqual(
          validityDetailUnpassRows(),
        );
        expect(helperRows.length, `§${padCaseNo(source.caseNo)} 脏数据行数必须大于 100`).toBeGreaterThan(100);
        expect(
          helperRows.every((row) => row.id !== null && row.id <= 100),
          `§${padCaseNo(source.caseNo)} 脏数据必须全部命中 id<=100 过滤条件`,
        ).toBe(true);
        expect(
          new Set(helperRows.map((row) => row.stringNum)).size,
          `§${padCaseNo(source.caseNo)} string_num 必须制造超过 100 个枚举值用于触发不通过`,
        ).toBe(helperRows.length);
        expect(
          spec.rules.map((rule) => evaluateRuleWithRows(rule, helperRows)),
          `§${padCaseNo(source.caseNo)} 有效性查看明细用例的规则必须全部静态推演为校验不通过`,
        ).toEqual(spec.rules.map(() => false));
      } else {
        expect(helperRows, `§${padCaseNo(source.caseNo)} 建表 helper 必须和源用例前置 SQL 数据一致`).toEqual(defaultRows);
      }
    }
  });

  test("完整性全通过用例的底表数据必须来自源用例默认 6 行干净数据", async () => {
    const rebuildSource = fs.readFileSync(path.join(CASES_DIR, "t16-ui-rebuild-v6411-cases.ts"), "utf8");
    expect(rebuildSource, "正式建表 SQL 必须使用共享底表数据 helper").toContain("baseRowsForV6411Case(build)");
    expect(rebuildSource, "正式脚本不得再维护第二份 cleanCompletenessRows 本地副本").not.toContain(
      "function cleanCompletenessRows()",
    );

    const defaultRows = sourceDefaultRows();
    expect(defaultRows, "源用例默认基础数据固定为 6 行").toEqual([
      {
        id: 1,
        age: 25,
        stringNum: "001",
        name: "张三",
        address: "北京市朝阳区",
        money: "5000.00",
        buyDateOffset: -30,
        dateDetail: "订单已完成",
      },
      {
        id: 2,
        age: 30,
        stringNum: "002",
        name: "李四",
        address: "上海市浦东新区",
        money: "6800.50",
        buyDateOffset: -29,
        dateDetail: "待发货",
      },
      {
        id: 3,
        age: 28,
        stringNum: "003",
        name: "王五",
        address: "广州市天河区",
        money: "4200.00",
        buyDateOffset: -28,
        dateDetail: "已取消",
      },
      {
        id: 4,
        age: 35,
        stringNum: "004",
        name: "赵六",
        address: "深圳市南山区",
        money: "9500.00",
        buyDateOffset: -27,
        dateDetail: "配送中",
      },
      {
        id: 5,
        age: 22,
        stringNum: "005",
        name: "小明",
        address: "杭州市西湖区",
        money: "3100.00",
        buyDateOffset: -26,
        dateDetail: "已完成",
      },
      {
        id: 6,
        age: 29,
        stringNum: "006",
        name: "小红",
        address: "成都市武侯区",
        money: "5600.00",
        buyDateOffset: -25,
        dateDetail: "退款中",
      },
    ]);

    for (const [index, row] of defaultRows.entries()) {
      expect(row.id, `源用例默认第 ${index + 1} 行 id 不得为空`).not.toBeNull();
      expect(row.name, `源用例默认第 ${index + 1} 行 name 不得为空值`).not.toBeNull();
      expect(row.name, `源用例默认第 ${index + 1} 行 name 不得为空串`).not.toBe("");
      expect(row.address, `源用例默认第 ${index + 1} 行 address 不得为空值`).not.toBeNull();
      expect(row.address, `源用例默认第 ${index + 1} 行 address 不得为空串`).not.toBe("");
    }

    const case36 = requiredCaseSpec(36);
    const case72 = requiredCaseSpec(72);
    expect(baseRowsForV6411Case(case36), "§36 Doris 全通过完整性用例必须使用源用例默认数据").toEqual(defaultRows);
    expect(baseRowsForV6411Case(case72), "§72 Spark 全通过完整性用例必须使用源用例默认数据").toEqual(defaultRows);

    expect(singleFieldCompletenessMetrics(baseRowsForV6411Case(case72)), "§72 底表数据必须让 5 条规则全通过").toEqual({
      idNullCount: 0,
      idNullRate: 0,
      nameEmptyCount: 0,
      nameEmptyRate: 0,
      tableRowCount: 6,
    });
  });

  test("全通过/全不通过用例的底表数据必须能静态推演出标题期望", async () => {
    const targetSpecs = EXPLICIT_RULE_CASE_SPECS.filter((spec) => /全通过|全不通过/.test(spec.title));
    expect(
      targetSpecs.map((spec) => spec.caseNo),
      "必须覆盖所有标题声明全通过/全不通过的 Doris 与 Spark 用例",
    ).toEqual([
      20, 21, 22, 23, 29, 30, 31, 32, 33, 34, 35, 36, 56, 57, 58, 59, 65, 66, 67, 68, 69, 70, 71, 72,
    ]);

    for (const spec of targetSpecs) {
      const expectedPass = spec.title.includes("全通过");
      const rows = baseRowsForV6411Case(spec);
      const results = spec.rules.map((rule) => ({
        rule: ruleFingerprint(rule),
        pass: evaluateRuleWithRows(rule, rows),
      }));
      expect(
        results,
        `§${padCaseNo(spec.caseNo)} ${spec.title} 的底表数据与规则期望不一致`,
      ).toEqual(spec.rules.map((rule) => ({ rule: ruleFingerprint(rule), pass: expectedPass })));
    }
  });

});

function parseCaseFilter(value: string): Set<number> {
  const result = new Set<number>();
  for (const item of value.split(",")) {
    const trimmed = item.trim();
    const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      for (let caseNo = Math.min(start, end); caseNo <= Math.max(start, end); caseNo += 1) {
        if (caseNo >= 1 && caseNo <= 72) result.add(caseNo);
      }
      continue;
    }

    const caseNo = Number(trimmed);
    if (Number.isFinite(caseNo) && caseNo >= 1 && caseNo <= 72) result.add(caseNo);
  }
  return result;
}

function padCaseNo(caseNo: number): string {
  return String(caseNo).padStart(2, "0");
}

function requiredCaseSpec(caseNo: number): V6411UiCaseSpec {
  const spec = EXPLICIT_RULE_CASE_SPECS.find((item) => item.caseNo === caseNo);
  expect(spec, `§${padCaseNo(caseNo)} 必须有显式规则规格`).toBeTruthy();
  return spec!;
}

function evaluateRuleWithRows(rule: V6411RuleSpec, rows: readonly V6411BaseTableRow[]): boolean {
  if (rule.category === "完整性校验") return evaluateCompletenessRule(rule, rows);
  if (rule.category === "有效性校验") return evaluateValidityRule(rule, rows);
  throw new Error(`暂不支持静态推演规则: ${rule.category}/${rule.functionName}`);
}

function evaluateCompletenessRule(rule: V6411RuleSpec, rows: readonly V6411BaseTableRow[]): boolean {
  const selectedRows = rows.filter((row) => rowMatchesFilter(row, rule.filter));
  const fields = rule.fields ?? [];
  let metric: number;
  switch (rule.functionName) {
    case "空值数":
      metric = selectedRows.filter((row) => fields.some((field) => rowValue(row, field) === null)).length;
      break;
    case "空值率":
      metric =
        selectedRows.length === 0
          ? 0
          : selectedRows.filter((row) => fields.some((field) => rowValue(row, field) === null)).length / selectedRows.length;
      break;
    case "空串数":
      metric = selectedRows.filter((row) => fields.some((field) => rowValue(row, field) === "")).length;
      break;
    case "空串率":
      metric =
        selectedRows.length === 0
          ? 0
          : selectedRows.filter((row) => fields.some((field) => rowValue(row, field) === "")).length / selectedRows.length;
      break;
    case "表行数":
      metric = selectedRows.length;
      break;
    default:
      throw new Error(`暂不支持完整性静态推演函数: ${rule.functionName}`);
  }
  return compareNumber(metric, rule.expected);
}

function evaluateValidityRule(rule: V6411RuleSpec, rows: readonly V6411BaseTableRow[]): boolean {
  const selectedRows = rows.filter((row) => rowMatchesFilter(row, rule.filter));
  const field = rule.fields?.[0];
  if (!field) throw new Error(`有效性规则缺少字段: ${rule.functionName}`);

  switch (rule.functionName) {
    case "数值-取值范围":
      return selectedRows.every((row) => evaluateRange(Number(rowValue(row, field)), rule.expected ?? ""));
    case "数值-枚举个数": {
      const distinctCount = new Set(selectedRows.map((row) => String(rowValue(row, field)))).size;
      return compareNumber(distinctCount, rule.expected);
    }
    case "枚举值":
      return selectedRows.every((row) => evaluateEnumValue(rowValue(row, field), rule.expected ?? ""));
    case "取值范围&枚举范围":
      return selectedRows.every((row) => evaluateRangeAndEnum(Number(rowValue(row, field)), rule));
    default:
      throw new Error(`暂不支持有效性静态推演函数: ${rule.functionName}`);
  }
}

function rowMatchesFilter(row: V6411BaseTableRow, filter: string | undefined): boolean {
  if (!filter) return true;
  const normalized = filter.replace(/\s+/g, "").toLowerCase();
  if (normalized === "id<=100") return row.id !== null && row.id <= 100;
  if (normalized === "id>=100andid<300") return row.id !== null && row.id >= 100 && row.id < 300;
  throw new Error(`暂不支持静态推演过滤条件: ${filter}`);
}

function rowValue(row: V6411BaseTableRow, field: string): string | number | null {
  switch (field) {
    case "id":
      return row.id;
    case "age":
      return row.age;
    case "string_num":
      return row.stringNum;
    case "name":
      return row.name;
    case "address":
      return row.address;
    case "money":
      return row.money;
    default:
      throw new Error(`暂不支持静态推演字段: ${field}`);
  }
}

function compareNumber(actual: number, expected: string | undefined): boolean {
  const match = expected?.trim().match(/^(>=|<=|!=|=|>|<)\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) throw new Error(`暂不支持静态推演期望值: ${expected}`);
  const target = Number(match[2]);
  switch (match[1]) {
    case "=":
      return actual === target;
    case "!=":
      return actual !== target;
    case ">":
      return actual > target;
    case ">=":
      return actual >= target;
    case "<":
      return actual < target;
    case "<=":
      return actual <= target;
    default:
      throw new Error(`暂不支持静态推演操作符: ${match[1]}`);
  }
}

function evaluateRange(value: number, expected: string): boolean {
  const text = expected.replace(/\s+/g, "");
  const connector = text.includes("或") ? "或" : "且";
  const parts = text.split(connector);
  const checks = parts.map((part) => compareNumber(value, part));
  return connector === "或" ? checks.some(Boolean) : checks.every(Boolean);
}

function evaluateEnumValue(value: string | number | null, expected: string): boolean {
  const text = expected.replace(/\s+/g, "");
  const mode = text.startsWith("notin") ? "notin" : text.startsWith("in") ? "in" : "";
  if (!mode) throw new Error(`暂不支持静态推演枚举值: ${expected}`);
  const values = text.slice(mode.length).split(",").filter(Boolean);
  const included = values.includes(String(value));
  return mode === "in" ? included : !included;
}

function evaluateRangeAndEnum(value: number, rule: V6411RuleSpec): boolean {
  const text = `${rule.expected ?? ""} ${rule.notes ?? ""}`.replace(/\s+/g, "");
  const range = text.match(/期望值([^」"]+)/)?.[1] ?? "";
  const enumText = text.match(/枚举值」：「([^」"]+)/)?.[1] ?? "";
  const relation = text.match(/关系」：「([^」"]+)/)?.[1] ?? "且";
  if (!range || !enumText) throw new Error(`暂不支持取值范围&枚举范围静态推演: ${text}`);
  const checks = [evaluateRange(value, range), evaluateEnumValue(value, enumText)];
  return relation === "或" ? checks.some(Boolean) : checks.every(Boolean);
}

function singleFieldCompletenessMetrics(rows: readonly V6411BaseTableRow[]) {
  const rowsInFilter = rows.filter((row) => row.id !== null && row.id <= 100);
  const idNullCount = rows.filter((row) => row.id === null).length;
  const nameEmptyCount = rowsInFilter.filter((row) => row.name === "").length;
  return {
    idNullCount,
    idNullRate: rows.length === 0 ? 0 : idNullCount / rows.length,
    nameEmptyCount,
    nameEmptyRate: rowsInFilter.length === 0 ? 0 : nameEmptyCount / rowsInFilter.length,
    tableRowCount: rowsInFilter.length,
  };
}

function assertSourcePreconditionUsesDefaultRows(
  caseNo: number,
  precondition: string,
  expectedRows: readonly V6411BaseTableRow[],
): void {
  const sql = normalizeSourceSql(precondition);
  expect(sql, `§${padCaseNo(caseNo)} 源前置 SQL 必须创建 test_info_1 主表`).toMatch(
    /CREATE TABLE\s+(?:[A-Za-z_][\w]*\.)?test_info_1\b/i,
  );
  expect(sql, `§${padCaseNo(caseNo)} 源前置 SQL 必须向 test_info_1 主表写入数据`).toMatch(
    /INSERT INTO(?: TABLE)?\s+(?:[A-Za-z_][\w]*\.)?test_info_1\b/i,
  );
  expect(sql, `§${padCaseNo(caseNo)} 源前置 SQL 不得混入落标用例 order_info 表`).not.toMatch(
    /(?:[A-Za-z_][\w]*\.)?order_info\b/i,
  );
  expect(sql, `§${padCaseNo(caseNo)} 源前置 SQL 必须插入 6 行数据`).toContain("插入6行数据");
  expect(sql, `§${padCaseNo(caseNo)} 源前置 SQL 的 id 必须按 user_idx 生成 1..6`).toMatch(
    /1\s*\+\s*user_idx\s+AS\s+id/i,
  );
  expect(sql, `§${padCaseNo(caseNo)} 源前置 SQL 的 buy_date 必须按 -30 + user_idx 生成`).toContain(
    "-30 + user_idx",
  );

  for (const [index, row] of expectedRows.entries()) {
    expectCaseExpression(sql, caseNo, index, String(row.age), "age");
    expectCaseExpression(sql, caseNo, index, sqlQuoted(row.stringNum), "string_num");
    expectCaseExpression(sql, caseNo, index, sqlQuoted(row.name), "name");
    expectCaseExpression(sql, caseNo, index, sqlQuoted(row.address), "address");
    expectCaseExpression(sql, caseNo, index, sqlQuoted(row.money), "money");
    expectCaseExpression(sql, caseNo, index, sqlQuoted(row.dateDetail), "date_detail");
  }
}

function sourcePreconditionHasBaseTableSql(precondition: string): boolean {
  const sql = normalizeSourceSql(precondition);
  return sql.includes("CREATE TABLE") && sql.includes("插入6行数据");
}

function expectCaseExpression(sql: string, caseNo: number, rowIndex: number, literal: string, field: string): void {
  const prefix = rowIndex === 5 ? "ELSE" : `WHEN ${rowIndex} THEN`;
  expect(sql, `§${padCaseNo(caseNo)} 源前置 SQL 字段 ${field} 第 ${rowIndex + 1} 行必须是 ${literal}`).toContain(
    `${prefix} ${literal}`,
  );
}

function sqlQuoted(value: string | null): string {
  return value === null ? "NULL" : `'${value.replace(/'/g, "''")}'`;
}

function normalizeSourceSql(value: string): string {
  return value
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
