#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const XMIND_NOTE_INLINE_LIMIT = 12000;
const XMIND_TITLE_LIMIT = 1800;
const XMIND_CHUNK_LIMIT = 900;
const MAX_TOPICS = 25000;
const MAX_DEPTH = 8;
const ROOT_STRUCTURE_CLASS = "org.xmind.ui.logic.right";
const MARKER_MAP = { P0: "priority-1", P1: "priority-1", P2: "priority-2", P3: "priority-3" };
const METADATA = {
  dataStructureVersion: "3",
  creator: { name: "kata-ltqc", version: "1" },
  layoutEngineVersion: "5",
};
const MANIFEST = { "file-entries": { "content.json": {}, "metadata.json": {} } };

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const defaultInput = join(featureDir, "岚图主流程用例整理.md");
const defaultOutput = join(featureDir, "岚图主流程用例整理.xmind");
const defaultReference = join(featureDir, "tmp", "ltqc-csv", "岚图主流程用例整理.xmind");

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
  return resolve(value);
}

function normalizeText(text) {
  return sanitizeText(text).trim();
}

function sanitizeText(text) {
  let result = "";
  for (const char of String(text ?? "").replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ")) {
    const code = char.charCodeAt(0);
    if ((code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31)) continue;
    result += char;
  }
  return result;
}

function xmindText(text) {
  return sanitizeText(text).replace(/<br\s*\/?>/gi, "\n");
}

function chunkText(text, limit = XMIND_CHUNK_LIMIT) {
  const normalized = xmindText(text).trim();
  if (!normalized) return [];
  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + limit, normalized.length);
    if (end < normalized.length) {
      const newline = normalized.lastIndexOf("\n", end);
      if (newline > start) end = newline + 1;
    }
    chunks.push(normalized.slice(start, end));
    start = end;
  }
  return chunks;
}

function topic(title, children = undefined, branch = undefined) {
  const node = {
    id: randomUUID().replaceAll("-", ""),
    class: "topic",
    title: xmindText(title),
  };
  if (branch) node.branch = branch;
  if (children?.length) node.children = { attached: children };
  return node;
}

function chunkParent(title, content) {
  const chunks = chunkText(content);
  return topic(
    title,
    chunks.map((chunk, index) => topic(`${index + 1}/${chunks.length}\n${chunk}`, undefined, "folded")),
    "folded",
  );
}

function textTopic(text, label) {
  const normalized = xmindText(text);
  if (normalized.length <= XMIND_TITLE_LIMIT) return topic(normalized || label, undefined, "folded");
  const summary = `${normalized.slice(0, 240).trimEnd()}...`;
  return topic(`${label}（内容较长，展开查看完整内容）\n${summary}`, [chunkParent("完整内容", normalized)], "folded");
}

function splitMarkdownTableRow(line) {
  const trimmed = String(line ?? "").trim();
  if (!trimmed.startsWith("|")) return [];
  const source = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
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

function markdownCellText(text) {
  return normalizeText(String(text ?? "").replace(/<br\s*\/?>/gi, "\n"));
}

function parseFrontmatter(lines) {
  if (lines[0]?.trim() !== "---") return { startLine: 0, suiteName: "岚图主流程用例集合", caseCount: 0 };
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end === -1) return { startLine: 0, suiteName: "岚图主流程用例集合", caseCount: 0 };
  let suiteName = "岚图主流程用例集合";
  let caseCount = 0;
  for (const line of lines.slice(1, end)) {
    const suite = line.match(/^suite_name:\s*"?([^"]+)"?\s*$/);
    if (suite) suiteName = suite[1].trim();
    const count = line.match(/^case_count:\s*(\d+)\s*$/);
    if (count) caseCount = Number(count[1]);
  }
  return { startLine: end + 1, suiteName, caseCount };
}

function parseArchive(markdown) {
  const lines = String(markdown ?? "").split("\n");
  const frontmatter = parseFrontmatter(lines);
  const cases = [];
  let module = "";
  let submodule = "";
  let current = null;
  let section = "";
  let inFence = false;
  let fenceMarker = "";
  let preconditions = [];
  let steps = [];
  let headerSeen = false;

  function flush() {
    if (current) {
      cases.push({
        ...current,
        preconditions: normalizeText(preconditions.join("\n")) || "无",
        steps,
      });
    }
    current = null;
    section = "";
    inFence = false;
    fenceMarker = "";
    preconditions = [];
    steps = [];
    headerSeen = false;
  }

  for (const line of lines.slice(frontmatter.startLine)) {
    if (line.startsWith("### ") && !line.startsWith("#### ")) {
      flush();
      module = normalizeText(line.slice(4));
      submodule = "";
      continue;
    }
    if (line.startsWith("#### ") && !line.startsWith("##### ")) {
      flush();
      submodule = normalizeText(line.slice(5));
      continue;
    }
    const heading = line.match(/^#####\s+【(P\d)】(.+)$/);
    if (heading) {
      flush();
      current = {
        module: module || "未分组",
        submodule,
        priority: heading[1],
        markerId: MARKER_MAP[heading[1]] ?? "priority-2",
        title: normalizeText(heading[2]),
      };
      continue;
    }
    if (!current) continue;

    if (/^>\s*前置条件/.test(line)) {
      section = "preconditions";
      inFence = false;
      fenceMarker = "";
      continue;
    }
    if (/^>\s*用例步骤/.test(line)) {
      section = "steps";
      headerSeen = false;
      inFence = false;
      fenceMarker = "";
      continue;
    }

    if (section === "preconditions") {
      const fence = line.match(/^(`{3,})\s*$/);
      if (fence && !inFence) {
        fenceMarker = fence[1];
        inFence = true;
      } else if (inFence && line.trim() === fenceMarker) {
        inFence = false;
        fenceMarker = "";
      } else if (inFence) {
        preconditions.push(line);
      }
      continue;
    }

    if (section === "steps") {
      if (/^\|\s*编号\s*\|/.test(line) || /^\|\s*-+\s*\|/.test(line)) {
        headerSeen = true;
        continue;
      }
      if (headerSeen && line.startsWith("|")) {
        const cells = splitMarkdownTableRow(line);
        if (cells.length >= 3) {
          steps.push({
            step: markdownCellText(cells[1]),
            expected: markdownCellText(cells[2]),
          });
        }
      }
    }
  }

  flush();
  return { ...frontmatter, cases };
}

function caseNode(testCase) {
  const children = [];
  const pre = xmindText(testCase.preconditions);
  const node = topic(testCase.title, undefined, "folded");
  node.markers = [{ markerId: testCase.markerId }];
  if (pre && pre !== "无") {
    if (pre.length <= XMIND_NOTE_INLINE_LIMIT) {
      node.notes = { plain: { content: pre } };
    } else {
      children.push(chunkParent("前置条件", pre));
    }
  }
  testCase.steps.forEach((row, index) => {
    if (!row.step.trim() && !row.expected.trim()) return;
    const step = textTopic(row.step, `步骤 ${index + 1}`);
    const expected = textTopic(row.expected, `预期 ${index + 1}`);
    step.children = { attached: [...(step.children?.attached ?? []), expected] };
    children.push(step);
  });
  if (children.length) node.children = { attached: children };
  return node;
}

function buildTree(parsed) {
  return buildTreeFromCases(parsed.cases);
}

function buildTreeFromCases(cases) {
  const modules = [];
  const byModule = new Map();
  for (const testCase of cases) {
    if (!byModule.has(testCase.module)) {
      const moduleRecord = { title: testCase.module, direct: [], submodules: new Map() };
      byModule.set(testCase.module, moduleRecord);
      modules.push(moduleRecord);
    }
    const moduleRecord = byModule.get(testCase.module);
    if (testCase.submodule) {
      if (!moduleRecord.submodules.has(testCase.submodule)) moduleRecord.submodules.set(testCase.submodule, []);
      moduleRecord.submodules.get(testCase.submodule).push(testCase);
    } else {
      moduleRecord.direct.push(testCase);
    }
  }

  return modules.map((moduleRecord) => {
    const children = [
      ...moduleRecord.direct.map(caseNode),
      ...[...moduleRecord.submodules.entries()].map(([title, items]) => topic(title, items.map(caseNode))),
    ];
    return topic(moduleRecord.title, children);
  });
}

async function loadReferenceRoot(referencePath) {
  if (!referencePath || !existsSync(referencePath)) return null;
  const zip = await JSZip.loadAsync(readFileSync(referencePath));
  const contentFile = zip.file("content.json");
  if (!contentFile) return null;
  const sheets = JSON.parse(await contentFile.async("string"));
  return sheets[0]?.rootTopic ?? null;
}

function isCaseTopic(node) {
  return (node.markers ?? []).some((marker) => String(marker.markerId ?? marker).startsWith("priority-"));
}

function shouldFoldCaseParent(node, depth = 0) {
  if (isCaseTopic(node)) return false;
  const children = node.children?.attached ?? [];
  if (!children.length) return false;
  const directCaseCount = children.filter(isCaseTopic).length;
  if (directCaseCount === 0) return false;
  if (depth >= 3) return true;
  return depth >= 2 && directCaseCount === children.length;
}

function applyBranchPolicy(root) {
  function visit(node, depth = 0, underCase = false) {
    const caseBranch = underCase || isCaseTopic(node);
    if (caseBranch || shouldFoldCaseParent(node, depth)) {
      node.branch = "folded";
    } else {
      delete node.branch;
    }
    for (const child of node.children?.attached ?? []) visit(child, depth + 1, caseBranch);
  }

  visit(root);
}

function priorityMarker(node) {
  return (node.markers ?? [])
    .map((marker) => String(marker.markerId ?? marker))
    .find((markerId) => markerId.startsWith("priority-"));
}

function referencePathMaps(referenceRoot) {
  const byMarkerAndTitle = new Map();
  const byTitle = new Map();

  function add(map, key, path) {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(path);
  }

  function walk(node, parents = []) {
    const markerId = priorityMarker(node);
    if (markerId) {
      const title = String(node.title ?? "");
      add(byMarkerAndTitle, `${markerId}\u0000${title}`, parents);
      add(byTitle, title, parents);
      return;
    }
    const nextParents = node === referenceRoot ? parents : [...parents, String(node.title ?? "")];
    for (const child of node.children?.attached ?? []) walk(child, nextParents);
  }

  if (referenceRoot) walk(referenceRoot);
  return { byMarkerAndTitle, byTitle };
}

function cloneReferenceSkeleton(node) {
  const cloned = structuredClone(node);
  cloned.id = randomUUID().replaceAll("-", "");
  cloned.class = "topic";
  delete cloned.branch;
  delete cloned.markers;
  delete cloned.notes;
  const children = [];
  for (const child of node.children?.attached ?? []) {
    if (isCaseTopic(child)) continue;
    children.push(cloneReferenceSkeleton(child));
  }
  if (children.length) cloned.children = { attached: children };
  else delete cloned.children;
  return cloned;
}

function findChild(node, title) {
  return (node.children?.attached ?? []).find((child) => String(child.title ?? "") === title);
}

function ensurePath(l1Nodes, path) {
  if (!path.length) throw new Error("empty xmind path");
  let node = l1Nodes.find((child) => String(child.title ?? "") === path[0]);
  if (!node) {
    node = topic(path[0]);
    l1Nodes.push(node);
  }
  for (const title of path.slice(1)) {
    let child = findChild(node, title);
    if (!child) {
      child = topic(title);
      node.children ??= { attached: [] };
      node.children.attached.push(child);
    }
    node = child;
  }
  return node;
}

function fallbackPath(testCase) {
  const text = `${testCase.module} ${testCase.submodule} ${testCase.title}`;
  if (/数据地图/.test(text)) return ["元数据", "数据地图"];
  if (/元数据同步/.test(text)) return ["元数据", "元数据同步"];
  if (/落标检查|dbc标准/i.test(text)) return ["数据标准", "落标检查"];
  if (testCase.module === "资产盘点") return ["资产盘点"];
  if (testCase.module === "元数据") {
    if (/元数据同步/.test(text)) return ["元数据", "元数据同步"];
    if (/元模型/.test(text)) return ["元数据", "元模型管理"];
    if (/元数据管理/.test(text)) return ["元数据", "元数据管理"];
    if (/订阅/.test(text)) return ["元数据", "订阅的数据"];
    if (/元数据质量/.test(text)) return ["元数据", "元数据质量"];
    return ["元数据", "数据地图"];
  }
  if (testCase.module === "数据标准") {
    if (/标准统计/.test(text)) return ["数据标准", "标准统计"];
    if (/落标/.test(text)) return ["数据标准", "落标检查"];
    if (/基础|码表|词根/.test(text)) return ["数据标准", "标准基础"];
    return ["数据标准", "标准管理"];
  }
  if (testCase.module === "数据模型") {
    if (/规范设计/.test(text)) return ["数据模型", "规范建表", "规范设计"];
    if (/授权|审批/.test(text)) return ["数据模型", "授权与审批"];
    if (/我的模型/.test(text)) return ["数据模型", "授权与审批"];
    return ["数据模型", "规范建表"];
  }
  if (testCase.module === "数据安全") {
    if (/脱敏/.test(text)) return ["数据安全", "数据脱敏管理"];
    if (/分级|分类/.test(text)) return ["数据安全", "数据分级分类"];
    return ["数据安全", "数据权限管理"];
  }
  if (testCase.module === "平台管理") {
    if (/用户|角色/.test(text)) return ["平台管理", "用户角色管理"];
    if (/通知/.test(text)) return ["平台管理", "通知中心"];
    return ["平台管理", "数据源管理"];
  }
  if (/总览|看板/.test(text)) return ["数据质量", "总览"];
  if (/通用配置|json格式|报告关联维表/.test(text)) {
    if (/报告关联维表/.test(text)) return ["数据质量", "通用配置", "报告关联维表设置"];
    return ["数据质量", "通用配置", "json格式校验管理"];
  }
  if (/脏数据管理|脏数据/.test(text)) return ["数据质量", "项目管理", "脏数据管理"];
  if (/项目|菜单名称|权限点/.test(text)) return ["数据质量", "项目管理", "项目信息"];
  if (/报告|已生成报告|已配置报告/.test(text)) return ["数据质量", "数据质量报告"];
  if (/校验结果|明细|日志|实例详情|结果详情/.test(text)) return ["数据质量", "校验结果查询"];
  if (/详细结果表/.test(text)) return ["数据质量", "校验结果查询"];
  if (/规则任务|监控规则|调度|分区|抽样|离线任务|导入规则包/.test(text)) return ["数据质量", "规则任务管理"];
  if (/规则集|规则配置/.test(text)) return ["数据质量", "规则集管理"];
  if (/规则库|内置规则|自定义sql|自定义SQL|自定义正则|正则匹配测试/.test(text)) return ["数据质量", "规则库配置"];
  if (/完整性校验|统计性校验|有效性校验|字段值校验|异常值检测|比对细节设置/.test(text)) {
    return ["数据质量", "规则库配置"];
  }
  return testCase.submodule ? [testCase.module, testCase.submodule] : [testCase.module || "未分组"];
}

function buildTreeWithReference(parsed, referenceRoot) {
  if (!referenceRoot) return buildTree(parsed);
  const maps = referencePathMaps(referenceRoot);
  const l1Nodes = (referenceRoot.children?.attached ?? [])
    .filter((child) => !isCaseTopic(child))
    .map(cloneReferenceSkeleton);

  for (const testCase of parsed.cases) {
    const markerKey = `${testCase.markerId}\u0000${testCase.title}`;
    const path =
      maps.byMarkerAndTitle.get(markerKey)?.shift() ??
      maps.byTitle.get(testCase.title)?.shift() ??
      fallbackPath(testCase);
    const target = ensurePath(l1Nodes, path);
    target.children ??= { attached: [] };
    target.children.attached.push(caseNode(testCase));
  }

  return l1Nodes;
}

function collectStats(root, parsed) {
  const stats = {
    archiveCases: parsed.cases.length,
    expectedArchiveCases: parsed.caseCount,
    topics: 0,
    markers: 0,
    maxDepth: 0,
    maxTitle: 0,
    maxNote: 0,
    caseTopics: 0,
    caseMixedNotes: 0,
    caseStepTopics: 0,
    expectedTopics: 0,
    visibleStepWrapperTopics: 0,
    openStructureTopics: 0,
    foldedCaseParentTopics: 0,
    foldedCaseAndDescendantTopics: 0,
    unexpectedOpenCaseAndDescendantTopics: 0,
    unexpectedOpenCaseParentTopics: 0,
    unexpectedFoldedStructureTopics: 0,
    missingId: 0,
    missingClass: 0,
  };

  function isCase(node) {
    return (node.markers ?? []).some((marker) => String(marker.markerId ?? marker).startsWith("priority-"));
  }

  function visit(node, depth = 0, underCase = false) {
    const caseLike = isCase(node);
    const caseBranch = underCase || caseLike;
    stats.topics += 1;
    stats.maxDepth = Math.max(stats.maxDepth, depth);
    stats.maxTitle = Math.max(stats.maxTitle, String(node.title ?? "").length);
    const note = String(node.notes?.plain?.content ?? node.notes?.html?.content ?? "");
    stats.maxNote = Math.max(stats.maxNote, note.length);
    if (!node.id) stats.missingId += 1;
    if (node.class !== "topic") stats.missingClass += 1;
    if (Array.isArray(node.markers)) {
      stats.markers += node.markers.filter((marker) => String(marker.markerId ?? marker).startsWith("priority-")).length;
    }
    if (caseBranch) {
      if (node.branch === "folded") stats.foldedCaseAndDescendantTopics += 1;
      else stats.unexpectedOpenCaseAndDescendantTopics += 1;
    } else {
      if (shouldFoldCaseParent(node, depth)) {
        if (node.branch === "folded") stats.foldedCaseParentTopics += 1;
        else stats.unexpectedOpenCaseParentTopics += 1;
      } else {
        stats.openStructureTopics += 1;
        if (node.branch === "folded") stats.unexpectedFoldedStructureTopics += 1;
      }
    }
    if (caseLike) {
      stats.caseTopics += 1;
      if (note.includes("用例步骤：") || /(^|\n)\s*\d+\.\s*步骤：/.test(note)) stats.caseMixedNotes += 1;
      const stepChildren = (node.children?.attached ?? []).filter((child) => child.title !== "前置条件");
      stats.caseStepTopics += stepChildren.length;
      stats.expectedTopics += stepChildren.filter((child) => (child.children?.attached ?? []).length > 0).length;
    }
    if (String(node.title ?? "") === "用例步骤" || String(node.title ?? "").startsWith("用例步骤 ")) {
      stats.visibleStepWrapperTopics += 1;
    }
    for (const child of node.children?.attached ?? []) visit(child, depth + 1, caseBranch);
  }

  visit(root);
  return stats;
}

function assertStats(stats) {
  const issues = [];
  if (stats.expectedArchiveCases && stats.archiveCases !== stats.expectedArchiveCases) {
    issues.push(`archive case count ${stats.archiveCases} != frontmatter ${stats.expectedArchiveCases}`);
  }
  if (stats.caseTopics !== stats.archiveCases) issues.push(`case topic count ${stats.caseTopics} != archive ${stats.archiveCases}`);
  if (stats.markers !== stats.archiveCases) issues.push(`priority marker count ${stats.markers} != archive ${stats.archiveCases}`);
  if (stats.topics > MAX_TOPICS) issues.push(`topic count ${stats.topics} > ${MAX_TOPICS}`);
  if (stats.maxDepth > MAX_DEPTH) issues.push(`max depth ${stats.maxDepth} > ${MAX_DEPTH}`);
  if (stats.maxTitle > XMIND_TITLE_LIMIT) issues.push(`max title ${stats.maxTitle} > ${XMIND_TITLE_LIMIT}`);
  if (stats.maxNote > XMIND_NOTE_INLINE_LIMIT) issues.push(`max note ${stats.maxNote} > ${XMIND_NOTE_INLINE_LIMIT}`);
  if (stats.caseMixedNotes > 0) issues.push(`case notes still contain steps: ${stats.caseMixedNotes}`);
  if (stats.visibleStepWrapperTopics > 0) issues.push(`visible step wrapper topics: ${stats.visibleStepWrapperTopics}`);
  if (stats.unexpectedOpenCaseAndDescendantTopics > 0) {
    issues.push(`case/descendant topics not folded: ${stats.unexpectedOpenCaseAndDescendantTopics}`);
  }
  if (stats.unexpectedOpenCaseParentTopics > 0) {
    issues.push(`case parent topics not folded: ${stats.unexpectedOpenCaseParentTopics}`);
  }
  if (stats.unexpectedFoldedStructureTopics > 0) {
    issues.push(`structure topics unexpectedly folded: ${stats.unexpectedFoldedStructureTopics}`);
  }
  if (stats.missingId > 0) issues.push(`missing id topics: ${stats.missingId}`);
  if (stats.missingClass > 0) issues.push(`missing class topics: ${stats.missingClass}`);
  if (issues.length) throw new Error(`main-flow xmind validation failed: ${issues.join("; ")}`);
}

async function main() {
  const input = argValue("--input", defaultInput);
  const output = argValue("--output", defaultOutput);
  const reference = argValue("--reference", existsSync(defaultReference) ? defaultReference : output);
  const parsed = parseArchive(readFileSync(input, "utf8"));
  const referenceRoot = await loadReferenceRoot(reference);
  const l1Nodes = buildTreeWithReference(parsed, referenceRoot);
  const rootId = randomUUID().replaceAll("-", "");
  const root = {
    id: rootId,
    class: "topic",
    title: parsed.suiteName || "岚图主流程用例集合",
    structureClass: ROOT_STRUCTURE_CLASS,
    children: { attached: l1Nodes },
  };
  applyBranchPolicy(root);
  const sheet = {
    id: randomUUID().replaceAll("-", ""),
    revisionId: randomUUID().replaceAll("-", ""),
    class: "sheet",
    title: "画布 1",
    rootTopic: root,
    arrangeableLayerOrder: [rootId],
    zones: [],
    theme: {},
    extensions: [
      {
        provider: "org.xmind.ui.skeleton.structure.style",
        content: { centralTopic: ROOT_STRUCTURE_CLASS },
      },
    ],
  };
  const stats = collectStats(root, parsed);
  assertStats(stats);

  const zip = new JSZip();
  zip.file("content.json", JSON.stringify([sheet]));
  zip.file("metadata.json", JSON.stringify(METADATA));
  zip.file("resources/", "");
  zip.file("manifest.json", JSON.stringify(MANIFEST));
  writeFileSync(output, await zip.generateAsync({ type: "nodebuffer", compression: "STORE" }));

  console.log(JSON.stringify({ output, rootTitle: root.title, moduleTitles: l1Nodes.map((node) => node.title), stats }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
