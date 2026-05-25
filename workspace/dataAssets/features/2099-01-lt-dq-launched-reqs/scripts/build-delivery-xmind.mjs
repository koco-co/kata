#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const XMIND_NOTE_INLINE_LIMIT = 12000;
const XMIND_TITLE_LIMIT = 1800;
const XMIND_CHUNK_LIMIT = 900;
const MAX_TOPICS = 25000;
const MAX_DEPTH = 7;
const DELIVERY_STRUCTURE_CLASS = "org.xmind.ui.logic.right";
const EXPECTED_VERSION_ORDER = ["v6.4.2", "v6.4.3", "v6.4.4", "v6.4.5", "v6.4.6", "v6.4.8", "v6.4.10"];
const PRIORITY_MARKER_MAP = { P0: "priority-1", P1: "priority-2", P2: "priority-3", P3: "priority-4" };

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const repoRoot = resolve(featureDir, "../../../..");

const defaultInput = join(featureDir, "岚图已上线需求主流程用例.md");
const defaultOutput = join(featureDir, "岚图已上线需求主流程用例.xmind");

const forbiddenTerms = [
  "自动化",
  "results/",
  "playwright",
  "ui-probe",
  "probe",
  "证据见",
  "实测",
  "探测",
  "本次探测",
  "LTQC",
  "阻塞",
  "返回 code=",
  "返回 []",
  "不能以本次",
  "当前环境",
  "/api/",
  "离线平台 CLI",
  "自行造数",
  "造数",
  "localhost:8876",
  "curl -X POST curl -X POST",
];

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return resolve(value);
}

function normalizeText(text) {
  let result = "";
  for (const char of String(text ?? "").replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ")) {
    const code = char.charCodeAt(0);
    if ((code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31)) {
      continue;
    }
    result += char;
  }
  return result.trim();
}

function stripHtml(text) {
  return normalizeText(text)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(?:p|span|div|font)[^>]*>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function xmindText(text) {
  return stripHtml(text);
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

function createTopic(title, children = undefined) {
  const topic = {
    id: randomUUID(),
    class: "topic",
    title: xmindText(title),
  };
  if (children?.length) topic.children = { attached: children };
  return topic;
}

function createChunkParent(title, content) {
  const chunks = chunkText(content);
  return createTopic(
    title,
    chunks.map((chunk, index) => createTopic(`${index + 1}/${chunks.length}\n${chunk}`)),
  );
}

function createTextTopic(text, label) {
  const normalized = xmindText(text).trim();
  if (normalized.length <= XMIND_TITLE_LIMIT) return createTopic(normalized || label);
  const summary = `${normalized.slice(0, 240).trimEnd()}...`;
  return createTopic(`${label}（内容较长，展开查看完整内容）\n${summary}`, [
    createChunkParent("完整内容", normalized),
  ]);
}

function createNoteTopic(title, content) {
  return {
    id: randomUUID(),
    class: "topic",
    title,
    notes: { plain: { content } },
  };
}

function splitCaseDetailNote(note) {
  const normalized = stripHtml(note);
  if (!normalized.includes("前置条件：") && !normalized.includes("用例步骤：")) {
    return null;
  }

  const preconditionMarker = "前置条件：";
  const stepsMarker = "用例步骤：";
  const preconditionIndex = normalized.indexOf(preconditionMarker);
  const stepsIndex = normalized.indexOf(stepsMarker);
  let preconditions = "";
  const steps = [];

  if (preconditionIndex !== -1) {
    const start = preconditionIndex + preconditionMarker.length;
    const end = stepsIndex !== -1 && stepsIndex > preconditionIndex ? stepsIndex : normalized.length;
    preconditions = normalized.slice(start, end).trim();
  }

  if (stepsIndex !== -1) {
    const stepsText = normalized.slice(stepsIndex + stepsMarker.length).trim();
    const matches = [...stepsText.matchAll(/(?:^|\n)\s*\d+\.\s*步骤：([\s\S]*?)(?=\n\s*\d+\.\s*步骤：|$)/g)];
    for (const match of matches) {
      const block = match[1].trim();
      const expectedMatch = block.match(/\n\s*预期：([\s\S]*)$/);
      const stepText = expectedMatch ? block.slice(0, expectedMatch.index).trim() : block;
      const expected = expectedMatch ? expectedMatch[1].trim() : "";
      if (stepText) steps.push({ step: stepText, expected });
    }
  }

  return { preconditions, steps };
}

function createStepTopic(stepText, expectedText, index) {
  const expectedTopic = createTextTopic(expectedText ?? "", `预期 ${index}`);
  const stepTopic = createTextTopic(stepText, `步骤 ${index}`);
  stepTopic.children = {
    attached: [...(stepTopic.children?.attached ?? []), expectedTopic],
  };
  return stepTopic;
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

function parseArchiveCases(markdown) {
  const cases = [];
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

  for (const line of String(markdown ?? "").split("\n")) {
    const heading = line.match(/^#####\s+【(P\d)】(.*)$/);
    if (heading) {
      flush();
      current = {
        markerId: PRIORITY_MARKER_MAP[heading[1]],
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
  return cases;
}

function parsedCaseMap(cases) {
  const map = new Map();
  for (const testCase of cases) {
    const key = `${testCase.markerId}\u0000${testCase.title}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(testCase);
  }
  return map;
}

function priorityMarker(topic) {
  return (topic.markers ?? [])
    .map((marker) => String(marker.markerId ?? marker))
    .find((markerId) => markerId.startsWith("priority-"));
}

function applyParsedCaseDetails(sheets, cases) {
  const casesByKey = parsedCaseMap(cases);
  const missing = [];

  function visit(topic) {
    const markerId = priorityMarker(topic);
    if (markerId) {
      const key = `${markerId}\u0000${normalizeText(topic.title)}`;
      const candidates = casesByKey.get(key);
      const testCase = candidates?.shift();
      if (!testCase) {
        missing.push(`${markerId} ${topic.title}`);
        return;
      }

      const preconditions = xmindText(testCase.preconditions || "").trim();
      const preconditionChildren = [];
      if (preconditions && preconditions !== "无") {
        if (preconditions.length <= XMIND_NOTE_INLINE_LIMIT) {
          topic.notes = { plain: { content: preconditions } };
        } else {
          preconditionChildren.push(createChunkParent("前置条件", preconditions));
          delete topic.notes;
        }
      } else {
        delete topic.notes;
      }

      const stepTopics = testCase.steps
        .filter((step) => step.step.trim() || step.expected.trim())
        .map((step, index) => createStepTopic(step.step, step.expected, index + 1));
      topic.children = { attached: [...preconditionChildren, ...stepTopics] };
      return;
    }

    for (const child of topic.children?.attached ?? []) visit(child);
  }

  for (const sheet of sheets) visit(sheet.rootTopic);

  const leftovers = [...casesByKey.entries()].flatMap(([key, values]) =>
    values.map((testCase) => `${key.split("\u0000")[0]} ${testCase.title}`),
  );
  if (missing.length > 0 || leftovers.length > 0) {
    throw new Error(
      `archive/xmind case mapping failed: missing=${missing.slice(0, 5).join(" | ")}, leftovers=${leftovers
        .slice(0, 5)
        .join(" | ")}`,
    );
  }
}

function ensureTopicShape(topic) {
  if (!topic.id) topic.id = randomUUID();
  if (!topic.class) topic.class = "topic";

  const title = normalizeText(topic.title);
  if (title.length > XMIND_TITLE_LIMIT) {
    topic.title = `${title.slice(0, XMIND_TITLE_LIMIT - 3)}...`;
    const children = topic.children?.attached ?? [];
    topic.children = {
      attached: [createNoteTopic("完整标题", title), ...children],
    };
  } else {
    topic.title = title || "未命名节点";
  }

  const note = normalizeText(topic.notes?.plain?.content ?? topic.notes?.html?.content ?? "");
  if (!note) {
    delete topic.notes;
  } else if (Array.isArray(topic.markers) && topic.markers.some((marker) => String(marker.markerId ?? marker).startsWith("priority-"))) {
    const detail = splitCaseDetailNote(note);
    if (detail) {
      const children = topic.children?.attached ?? [];
      const preconditions = xmindText(detail.preconditions || "").trim();
      const preconditionChildren = [];
      if (preconditions && preconditions !== "无") {
        if (preconditions.length <= XMIND_NOTE_INLINE_LIMIT) {
          topic.notes = { plain: { content: preconditions } };
        } else {
          preconditionChildren.push(createChunkParent("前置条件", preconditions));
          delete topic.notes;
        }
      } else {
        delete topic.notes;
      }
      const stepTopics = detail.steps.map((step, index) => createStepTopic(step.step, step.expected, index + 1));
      topic.children = { attached: [...preconditionChildren, ...stepTopics, ...children] };
    } else {
      topic.notes = { plain: { content: stripHtml(note) } };
    }
  } else if (note.length <= XMIND_NOTE_INLINE_LIMIT) {
    topic.notes = { plain: { content: note } };
  } else {
    const children = topic.children?.attached ?? [];
    topic.children = { attached: [createChunkParent("完整内容", note), ...children] };
    delete topic.notes;
  }

  for (const child of topic.children?.attached ?? []) {
    ensureTopicShape(child);
  }
}

function compareVersionTitle(left, right) {
  const leftMatch = String(left ?? "").match(/^v(\d+)\.(\d+)\.(\d+)$/);
  const rightMatch = String(right ?? "").match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (!leftMatch || !rightMatch) return String(left ?? "").localeCompare(String(right ?? ""));

  for (let index = 1; index <= 3; index += 1) {
    const diff = Number(leftMatch[index]) - Number(rightMatch[index]);
    if (diff !== 0) return diff;
  }
  return 0;
}

function setSkeletonStructure(sheet, structureClass) {
  const extensions = Array.isArray(sheet.extensions) ? sheet.extensions : [];
  const provider = "org.xmind.ui.skeleton.structure.style";
  const extension = extensions.find((item) => item?.provider === provider);
  if (extension) {
    extension.content = { ...(extension.content ?? {}), centralTopic: structureClass };
  } else {
    extensions.push({ provider, content: { centralTopic: structureClass } });
  }
  sheet.extensions = extensions;
}

function applyDeliveryLayout(sheets) {
  const sheet = sheets[0];
  const root = sheet?.rootTopic;
  if (!sheet || !root) return;

  sheet.title = root.title || "岚图已上线需求主流程用例";
  root.structureClass = DELIVERY_STRUCTURE_CLASS;
  setSkeletonStructure(sheet, DELIVERY_STRUCTURE_CLASS);

  const versionTopics = root.children?.attached;
  if (Array.isArray(versionTopics)) {
    root.children.attached = versionTopics.toSorted((left, right) => compareVersionTitle(left.title, right.title));
  }

  function visit(topic, depth = 0) {
    if (depth >= 2) {
      topic.branch = "folded";
    } else {
      delete topic.branch;
    }

    if (depth > 0) delete topic.structureClass;

    for (const child of topic.children?.attached ?? []) visit(child, depth + 1);
  }

  visit(root);
}

function flattenSingleRequirementRoot(sheets) {
  const sheet = sheets[0];
  const root = sheet?.rootTopic;
  const onlyChild = root?.children?.attached?.length === 1 ? root.children.attached[0] : undefined;
  if (!root || !onlyChild) return false;
  sheet.rootTopic = onlyChild;
  ensureTopicShape(sheet.rootTopic);
  return true;
}

function collectStats(sheets, contentText) {
  const stats = {
    topics: 0,
    markers: 0,
    maxDepth: 0,
    maxTitle: 0,
    maxNote: 0,
    caseTopics: 0,
    caseNotesWithPreconditions: 0,
    caseMixedNotes: 0,
    caseStepTopics: 0,
    expectedTopics: 0,
    preconditionChunkTopics: 0,
    visibleStepWrapperTopics: 0,
    missingId: 0,
    missingClass: 0,
    branchByDepth: {},
    badCounts: {},
  };

  function visit(topic, depth = 0) {
    stats.topics += 1;
    stats.maxDepth = Math.max(stats.maxDepth, depth);
    stats.maxTitle = Math.max(stats.maxTitle, String(topic.title ?? "").length);
    stats.maxNote = Math.max(
      stats.maxNote,
      String(topic.notes?.plain?.content ?? topic.notes?.html?.content ?? "").length,
    );
    if (!topic.id) stats.missingId += 1;
    if (!topic.class) stats.missingClass += 1;
    const branch = topic.branch ?? "<none>";
    stats.branchByDepth[depth] ??= {};
    stats.branchByDepth[depth][branch] = (stats.branchByDepth[depth][branch] ?? 0) + 1;
    const isCaseTopic =
      Array.isArray(topic.markers) &&
      topic.markers.some((marker) => String(marker.markerId ?? marker).startsWith("priority-"));
    if (Array.isArray(topic.markers)) {
      stats.markers += topic.markers.filter((marker) => String(marker.markerId ?? marker).startsWith("priority-")).length;
    }
    if (isCaseTopic) {
      stats.caseTopics += 1;
      const caseNote = String(topic.notes?.plain?.content ?? topic.notes?.html?.content ?? "");
      const directChildren = topic.children?.attached ?? [];
      const stepChildren = directChildren.filter((child) => String(child.title ?? "") !== "前置条件");
      if (caseNote.trim()) stats.caseNotesWithPreconditions += 1;
      if (caseNote.includes("用例步骤：") || /(^|\n)\s*\d+\.\s*步骤：/.test(caseNote)) stats.caseMixedNotes += 1;
      stats.caseStepTopics += stepChildren.length;
      stats.expectedTopics += stepChildren.filter((child) => (child.children?.attached ?? []).length > 0).length;
    }
    if (String(topic.title ?? "") === "前置条件") {
      stats.preconditionChunkTopics += 1;
    }
    if (String(topic.title ?? "") === "用例步骤" || String(topic.title ?? "").startsWith("用例步骤 ")) {
      stats.visibleStepWrapperTopics += 1;
    }
    for (const child of topic.children?.attached ?? []) visit(child, depth + 1);
  }

  for (const sheet of sheets) visit(sheet.rootTopic);

  stats.badCounts = Object.fromEntries(
    forbiddenTerms
      .map((term) => [term, contentText.split(term).length - 1])
      .filter(([, count]) => count > 0),
  );

  return stats;
}

function assertDeliveryStats(sheets, contentText) {
  const root = sheets[0]?.rootTopic;
  const stats = collectStats(sheets, contentText);
  const issues = [];

  if (root?.title !== "岚图已上线需求主流程用例") {
    issues.push(`unexpected root title: ${root?.title ?? "<missing>"}`);
  }
  if (sheets[0]?.title !== root?.title) {
    issues.push(`unexpected sheet title: ${sheets[0]?.title ?? "<missing>"}`);
  }
  if (root?.structureClass !== DELIVERY_STRUCTURE_CLASS) {
    issues.push(`unexpected root structure: ${root?.structureClass ?? "<missing>"}`);
  }

  const versionOrder = root?.children?.attached?.map((topic) => topic.title) ?? [];
  if (versionOrder.join("|") !== EXPECTED_VERSION_ORDER.join("|")) {
    issues.push(`unexpected version order: ${versionOrder.join(", ")}`);
  }

  for (const [depthText, counts] of Object.entries(stats.branchByDepth)) {
    const depth = Number(depthText);
    if (depth < 2 && Object.keys(counts).some((branch) => branch !== "<none>")) {
      issues.push(`unexpected branch at depth ${depth}: ${JSON.stringify(counts)}`);
    }
    if (depth >= 2 && Object.keys(counts).some((branch) => branch !== "folded")) {
      issues.push(`unfolded branch at depth ${depth}: ${JSON.stringify(counts)}`);
    }
  }

  if (stats.markers !== 1216) issues.push(`priority marker count ${stats.markers} != 1216`);
  if (stats.topics > MAX_TOPICS) issues.push(`topic count ${stats.topics} > ${MAX_TOPICS}`);
  if (stats.maxDepth > MAX_DEPTH) issues.push(`max depth ${stats.maxDepth} > ${MAX_DEPTH}`);
  if (stats.visibleStepWrapperTopics > 0) {
    issues.push(`visible step wrapper topics: ${stats.visibleStepWrapperTopics}`);
  }
  if (stats.caseTopics !== 1216) issues.push(`case topic count ${stats.caseTopics} != 1216`);
  if (stats.caseNotesWithPreconditions !== 1216) {
    issues.push(`case notes with preconditions ${stats.caseNotesWithPreconditions} != 1216`);
  }
  if (stats.caseMixedNotes > 0) {
    issues.push(`case notes still contain steps: ${stats.caseMixedNotes}`);
  }
  if (stats.caseStepTopics < 1216) {
    issues.push(`case step topics ${stats.caseStepTopics} < 1216`);
  }
  const sectionMixIssues = findSectionMixIssues(sheets);
  if (sectionMixIssues.length > 0) {
    issues.push(`section mix issues: ${JSON.stringify(sectionMixIssues.slice(0, 5))}`);
  }
  if (stats.missingId > 0) issues.push(`missing id topics: ${stats.missingId}`);
  if (stats.missingClass > 0) issues.push(`missing class topics: ${stats.missingClass}`);
  if (Object.keys(stats.badCounts).length > 0) {
    issues.push(`forbidden terms: ${JSON.stringify(stats.badCounts)}`);
  }

  if (issues.length > 0) {
    throw new Error(`delivery xmind validation failed: ${issues.join("; ")}`);
  }

  return stats;
}

function findSectionMixIssues(sheets) {
  const issues = [];

  function visit(topic, path = []) {
    const nextPath = [...path, topic.title ?? ""].filter(Boolean);
    const title = String(topic.title ?? "");
    const note = String(topic.notes?.plain?.content ?? topic.notes?.html?.content ?? "");
    const isCaseTopic =
      Array.isArray(topic.markers) &&
      topic.markers.some((marker) => String(marker.markerId ?? marker).startsWith("priority-"));

    if (title === "用例步骤" || title.startsWith("用例步骤 ")) {
      issues.push({ type: "step_wrapper_topic_under_case", path: nextPath.join(" > ") });
    }
    if (title.startsWith("前置条件") && note.includes("用例步骤：")) {
      issues.push({ type: "steps_in_precondition", path: nextPath.join(" > ") });
    }

    for (const child of topic.children?.attached ?? []) visit(child, nextPath);
  }

  for (const sheet of sheets) visit(sheet.rootTopic);
  return issues;
}

async function main() {
  const input = argValue("--input", defaultInput);
  const output = argValue("--output", defaultOutput);
  const projectIndex = process.argv.indexOf("--project");
  const project = projectIndex === -1 ? "dataAssets" : process.argv[projectIndex + 1];
  if (!project || project.startsWith("--")) throw new Error("Missing value for --project");

  const tempDir = join(tmpdir(), `lt-delivery-xmind-${process.pid}-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });
  const tempXmind = join(tempDir, "base.xmind");

  try {
    execFileSync(
      "bun",
      [
        join(repoRoot, "engine/bin/kata"),
        "xmind-gen",
        "--input",
        input,
        "--output",
        tempXmind,
        "--mode",
        "create",
        "--project",
        project,
        "--steps-as-notes",
      ],
      { cwd: repoRoot, stdio: "pipe" },
    );

    const zip = await JSZip.loadAsync(readFileSync(tempXmind));
    const contentFile = zip.file("content.json");
    if (!contentFile) throw new Error("missing content.json");

    const sheets = JSON.parse(await contentFile.async("string"));
    const archiveCases = parseArchiveCases(readFileSync(input, "utf8"));
    flattenSingleRequirementRoot(sheets);
    applyParsedCaseDetails(sheets, archiveCases);
    for (const sheet of sheets) ensureTopicShape(sheet.rootTopic);
    applyDeliveryLayout(sheets);

    const contentText = JSON.stringify(sheets);
    const stats = assertDeliveryStats(sheets, contentText);
    zip.file("content.json", contentText);

    const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    writeFileSync(output, out);

    console.log(
      JSON.stringify(
        {
          output,
          rootTitle: sheets[0]?.rootTopic?.title,
          structureClass: sheets[0]?.rootTopic?.structureClass,
          versionOrder: sheets[0]?.rootTopic?.children?.attached?.map((topic) => topic.title),
          stats,
        },
        null,
        2,
      ),
    );
  } finally {
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
