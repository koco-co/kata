import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { CaseLintReport, CaseLintViolation } from "./types.ts";

const MACHINE_FILES = ["source-snapshot.json", "coverage-matrix.json"];
const ALLOWED_FRONTMATTER = new Set([
  "suite_name",
  "root_name",
  "module",
  "prd_version",
  "prd_id",
  "tags",
  "status",
  "create_at",
  "case_count",
  "origin",
  // archive-gen 实写、且全部真实 archive 在用：description；xmind-gen 消费产品线段：product_line
  "description",
  "product_line",
]);
const TITLE_MACHINE_ID_RE = /\b(TC|SR|RA)-[A-Z0-9]/;
const PRIORITY_RE = /^【P\d+】/;
// 前置条件里的系统级状态占位（不可核对、无测试数据）；只在前置代码块内匹配，warn
const PRECOND_PLACEHOLDER_RE =
  /已正常部署运行|已正常部署|系统已正常运行|环境已就绪|已启动运行|各服务(均)?(正常)?运行|各服务正常|服务(均)?正常运行/;
const SQL_STATEMENT_START_RE =
  /^(?:CREATE|INSERT|SELECT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|WITH|MERGE|USE|SET|SHOW|DESCRIBE|DESC|GRANT|REVOKE|COMMENT)\b/i;
const WEAK_EXPECTED_RE = /(?:^|[，、；;。\s])(进入成功|符合预期)(?:$|[，、；;。\s])/;
const LEGACY_DATA_PLACEHOLDER_RE = /已有数据源|已有数据库|已有数据表/;

function splitMarkdownTableRow(line: string): string[] {
  const source = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let buffer = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "|" && source[index - 1] !== "\\") {
      cells.push(buffer.replace(/\\\|/g, "|").trim());
      buffer = "";
    } else {
      buffer += char;
    }
  }
  cells.push(buffer.replace(/\\\|/g, "|").trim());
  return cells;
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function scanArchive(featureDir: string, violations: CaseLintViolation[]): void {
  const archivePath = join(featureDir, "cases", "archive.md");
  if (!existsSync(archivePath)) return;
  const lines = readFileSync(archivePath, "utf-8").split("\n");

  let inFrontmatter = false;
  let frontmatterDone = false;
  let declaredCaseCount: number | null = null;
  let h5Count = 0;
  let inPrecond = false;
  let expectPrecondFence = false;
  let inSqlStatement = false;
  for (const [i, line] of lines.entries()) {
    // frontmatter field whitelist
    if (i === 0 && line.trim() === "---") {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter && !frontmatterDone) {
      if (line.trim() === "---") {
        frontmatterDone = true;
        inFrontmatter = false;
        continue;
      }
      const kv = line.match(/^(\w[\w_]*)\s*:/);
      const key = kv?.[1];
      if (key === "case_count") {
        const cc = line.match(/^case_count\s*:\s*(\d+)/);
        if (cc) declaredCaseCount = Number(cc[1]);
      }
      if (key && !ALLOWED_FRONTMATTER.has(key)) {
        violations.push({
          rule: "archive-frontmatter-deprecated",
          file: archivePath,
          lineNumber: i + 1,
          matched: key,
          severity: "warn",
          message: `frontmatter 字段 "${key}" 不在允许集，去除或改用当前 case-qa/output-artifacts 规定字段`,
        });
      }
      continue;
    }

    // 前置条件代码块内：扫描系统级状态占位（warn，只在前置块内匹配，避免误伤步骤/预期）
    const trimmed = line.trim();
    if (/^>\s*前置条件/.test(trimmed)) {
      expectPrecondFence = true;
      continue;
    }
    if (expectPrecondFence && trimmed.startsWith("```")) {
      inPrecond = true;
      expectPrecondFence = false;
      inSqlStatement = false;
      if (trimmed !== "```SQL") {
        violations.push({
          rule: "archive-precondition-sql-fence",
          file: archivePath,
          lineNumber: i + 1,
          matched: trimmed,
          severity: "fail",
          message: "前置条件必须使用 ```SQL 代码块",
        });
      }
      continue;
    }
    if (inPrecond) {
      if (trimmed.startsWith("```")) {
        inPrecond = false;
        inSqlStatement = false;
        continue;
      }
      const m = trimmed.match(PRECOND_PLACEHOLDER_RE);
      if (m) {
        violations.push({
          rule: "archive-precondition-placeholder",
          file: archivePath,
          lineNumber: i + 1,
          matched: m[0],
          severity: "warn",
          message:
            "前置条件出现系统级状态占位（不可核对、无测试数据）；改写为具体数据源/库表/已存在记录或建表 SQL",
        });
      }
      if (!trimmed || trimmed.startsWith("--")) continue;
      if (inSqlStatement) {
        if (trimmed.includes(";")) inSqlStatement = false;
        continue;
      }
      if (SQL_STATEMENT_START_RE.test(trimmed)) {
        inSqlStatement = !trimmed.includes(";");
        continue;
      }
      violations.push({
        rule: "archive-precondition-prose-not-comment",
        file: archivePath,
        lineNumber: i + 1,
        matched: trimmed.slice(0, 80),
        severity: "fail",
        message: "前置条件中的非 SQL 描述必须使用 -- 注释",
      });
      continue;
    }

    // case heading: ##### 【Pn】title
    const h5 = line.match(/^#####\s+(.+)$/);
    const heading = h5?.[1];
    if (heading) {
      h5Count += 1;
      const title = heading.trim();
      const afterPriority = title.replace(PRIORITY_RE, "").trim();
      if (TITLE_MACHINE_ID_RE.test(afterPriority)) {
        violations.push({
          rule: "archive-title-machine-id",
          file: archivePath,
          lineNumber: i + 1,
          matched: afterPriority.slice(0, 24),
          severity: "fail",
          message: "用例标题禁止机器标识（TC-/SR-/RA-）",
        });
      }
      // bracket semantics: 【】 only allowed as 【Pn】 prefix
      const stripped = title.replace(PRIORITY_RE, "");
      if (stripped.includes("【")) {
        violations.push({
          rule: "archive-bracket-semantics",
          file: archivePath,
          lineNumber: i + 1,
          matched: "【",
          severity: "warn",
          message: "标题中【】仅用于【Pn】优先级前缀，UI 名用「」",
        });
      }
    }

    if (/^\|\s*\d+\s*\|/.test(line)) {
      const cells = splitMarkdownTableRow(line);
      const step = cells[1] ?? "";
      const expected = cells.slice(2).join("|").trim();
      if (!expected) {
        violations.push({
          rule: "archive-empty-expected",
          file: archivePath,
          lineNumber: i + 1,
          matched: step.slice(0, 80),
          severity: "fail",
          message: "用例步骤缺少可核对的预期结果",
        });
      }
      const weak = expected.match(WEAK_EXPECTED_RE)?.[1];
      if (weak) {
        violations.push({
          rule: "archive-weak-expected",
          file: archivePath,
          lineNumber: i + 1,
          matched: weak,
          severity: "fail",
          message: "预期结果必须描述可观察的页面、字段、状态或数据，不得使用空泛断言",
        });
      }
      const legacyPlaceholder = `${step} ${expected}`.match(LEGACY_DATA_PLACEHOLDER_RE)?.[0];
      if (legacyPlaceholder) {
        violations.push({
          rule: "archive-legacy-data-placeholder",
          file: archivePath,
          lineNumber: i + 1,
          matched: legacyPlaceholder,
          severity: "fail",
          message: `数据源和数据库必须使用 \${DataSourceA}/\${SchemaA} 占位符，数据表使用已建具体表名`,
        });
      }
      if (/\bUI Check\b/i.test(step) || step.includes("锁不锁操作")) {
        violations.push({
          rule: "archive-ambiguous-step",
          file: archivePath,
          lineNumber: i + 1,
          matched: step.slice(0, 80),
          severity: "fail",
          message: "步骤必须写明具体查看或操作对象，不得保留测试草稿占位语",
        });
      }
      if (/^\d+[.．、]?\s*$/.test(expected)) {
        violations.push({
          rule: "archive-orphan-expected-number",
          file: archivePath,
          lineNumber: i + 1,
          matched: expected,
          severity: "fail",
          message: "预期结果仅剩编号，需回到原用例恢复并与步骤重新配对",
        });
      }
    }
  }

  // frontmatter case_count 必须等于实际 ##### 用例标题数（声明了 case_count 才校验）
  if (declaredCaseCount !== null && declaredCaseCount !== h5Count) {
    violations.push({
      rule: "archive-case-count-mismatch",
      file: archivePath,
      lineNumber: 1,
      matched: `case_count=${declaredCaseCount} vs ##### x${h5Count}`,
      severity: "fail",
      message: `frontmatter case_count=${declaredCaseCount} 与实际用例标题数 ${h5Count} 不一致`,
    });
  }
}

function scanMachineFilesInRoot(featureDir: string, violations: CaseLintViolation[]): void {
  for (const f of MACHINE_FILES) {
    if (existsSync(join(featureDir, f))) {
      violations.push({
        rule: "archive-machine-file-in-root",
        file: join(featureDir, f),
        lineNumber: 1,
        matched: f,
        severity: "fail",
        message: `${f} 必须落 .process/，禁止污染 feature 根`,
      });
    }
  }
}

export function lintArchiveCaseQa(featuresGlobRoot: string): CaseLintReport {
  const violations: CaseLintViolation[] = [];
  let files = 0;
  // featuresGlobRoot may be <workspace>/<project>/features or one feature dir.
  const roots: string[] = [];
  if (isDir(featuresGlobRoot) && existsSync(join(featuresGlobRoot, "cases", "archive.md"))) {
    roots.push(featuresGlobRoot);
  } else if (isDir(featuresGlobRoot) && featuresGlobRoot.endsWith("features")) {
    roots.push(featuresGlobRoot);
  } else if (isDir(featuresGlobRoot)) {
    for (const proj of readdirSync(featuresGlobRoot)) {
      const fr = join(featuresGlobRoot, proj, "features");
      if (isDir(fr)) roots.push(fr);
    }
  }
  for (const fr of roots) {
    if (existsSync(join(fr, "cases", "archive.md"))) {
      files += 1;
      scanArchive(fr, violations);
      scanMachineFilesInRoot(fr, violations);
      continue;
    }
    for (const fid of readdirSync(fr)) {
      const fdir = join(fr, fid);
      if (!isDir(fdir)) continue;
      if (!existsSync(join(fdir, "cases", "archive.md"))) continue;
      files += 1;
      scanArchive(fdir, violations);
      scanMachineFilesInRoot(fdir, violations);
    }
  }
  return { scanRoot: featuresGlobRoot, files, violations, passed: violations.length === 0 };
}
