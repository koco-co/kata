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
]);
const TITLE_MACHINE_ID_RE = /\b(TC|SR|RA)-[A-Z0-9]/;
const PRIORITY_RE = /^【P\d+】/;

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function scanArchive(featureDir: string, violations: CaseLintViolation[]): void {
  const archivePath = join(featureDir, "archive.md");
  if (!existsSync(archivePath)) return;
  const lines = readFileSync(archivePath, "utf-8").split("\n");

  let inFrontmatter = false;
  let frontmatterDone = false;
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

    // case heading: ##### 【Pn】title
    const h5 = line.match(/^#####\s+(.+)$/);
    const heading = h5?.[1];
    if (heading) {
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
  if (isDir(featuresGlobRoot) && existsSync(join(featuresGlobRoot, "archive.md"))) {
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
    if (existsSync(join(fr, "archive.md"))) {
      files += 1;
      scanArchive(fr, violations);
      scanMachineFilesInRoot(fr, violations);
      continue;
    }
    for (const fid of readdirSync(fr)) {
      const fdir = join(fr, fid);
      if (!isDir(fdir)) continue;
      if (!existsSync(join(fdir, "archive.md"))) continue;
      files += 1;
      scanArchive(fdir, violations);
      scanMachineFilesInRoot(fdir, violations);
    }
  }
  return { scanRoot: featuresGlobRoot, files, violations, passed: violations.length === 0 };
}
