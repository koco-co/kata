#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const PRIORITY_MARKER_MAP = { P0: "priority-1", P1: "priority-2", P2: "priority-3", P3: "priority-4" };
const MARKER_PRIORITY_MAP = Object.fromEntries(Object.entries(PRIORITY_MARKER_MAP).map(([key, value]) => [value, key]));

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const defaultArchive = resolve(featureDir, "岚图已上线需求主流程用例.md");
const defaultXmind = resolve(featureDir, "岚图已上线需求主流程用例.xmind");

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
  return resolve(value);
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

function normalizeText(text) {
  return String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseArchive(markdown) {
  const cases = [];
  let version = "";
  let current = null;
  let section = "";
  let inFence = false;
  let fenceMarker = "";
  let preconditions = [];
  let steps = [];
  let headerSeen = false;

  function flush() {
    if (!current) return;
    cases.push({
      ...current,
      preconditions: normalizeText(preconditions.join("\n")),
      steps,
    });
    current = null;
    section = "";
    inFence = false;
    fenceMarker = "";
    preconditions = [];
    steps = [];
    headerSeen = false;
  }

  for (const line of String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const versionMatch = line.match(/^##\s+(v6\.4\.\d+)\s*$/);
    if (versionMatch) {
      flush();
      version = versionMatch[1];
      continue;
    }
    const caseMatch = line.match(/^#####\s+【(P[0-3])】(.+?)\s*$/);
    if (caseMatch) {
      flush();
      current = {
        index: cases.length + 1,
        version,
        priority: caseMatch[1],
        title: normalizeText(caseMatch[2]),
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
      inFence = false;
      fenceMarker = "";
      headerSeen = false;
      continue;
    }

    if (section === "preconditions") {
      const fence = line.match(/^(`{3,})(?:[A-Za-z0-9_-]+)?\s*$/);
      if (fence && !inFence) {
        inFence = true;
        fenceMarker = fence[1];
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
            step: normalizeText(cells[1]),
            expected: normalizeText(cells.slice(2).join("|")),
          });
        }
      }
    }
  }
  flush();
  return cases;
}

function priorityFromTopic(topic) {
  const markerId = (topic.markers ?? [])
    .map((marker) => String(marker.markerId ?? marker))
    .find((value) => value.startsWith("priority-"));
  return MARKER_PRIORITY_MAP[markerId] ?? null;
}

function chunkText(topic) {
  return (topic.children?.attached ?? [])
    .map((child) => {
      const title = String(child.title ?? "");
      const match = title.match(/^\d+\/\d+\n([\s\S]*)$/);
      return match ? match[1] : title;
    })
    .join("");
}

function textTopic(topic, fallback = "") {
  const full = (topic.children?.attached ?? []).find((child) => String(child.title ?? "") === "完整内容");
  if (full) return normalizeText(chunkText(full));
  const title = String(topic.title ?? "");
  const longMatch = title.match(/^.+?（内容较长，展开查看完整内容）\n([\s\S]*)$/);
  return normalizeText(longMatch ? longMatch[1].replace(/\.\.\.$/, "") : title || fallback);
}

function parseXmindCase(topic, version, index) {
  const children = topic.children?.attached ?? [];
  const preconditions = normalizeText(topic.notes?.plain?.content ?? topic.notes?.html?.content ?? "");
  const steps = [];

  for (const child of children) {
    if (String(child.title ?? "") === "前置条件") continue;
    const childChildren = child.children?.attached ?? [];
    const expectedTopic =
      childChildren.find((item) => String(item.title ?? "").startsWith("预期 ")) ?? childChildren.at(-1);
    steps.push({
      step: textTopic(child),
      expected: expectedTopic ? textTopic(expectedTopic) : "",
    });
  }

  return {
    index,
    version,
    priority: priorityFromTopic(topic),
    title: normalizeText(topic.title),
    preconditions,
    steps,
  };
}

async function parseXmind(path) {
  const zip = await JSZip.loadAsync(readFileSync(path));
  const contentFile = zip.file("content.json");
  if (!contentFile) throw new Error("missing content.json");
  const sheets = JSON.parse(await contentFile.async("string"));
  const cases = [];

  function visit(topic, version = "") {
    const title = String(topic.title ?? "");
    const nextVersion = /^v6\.4\.\d+$/.test(title) ? title : version;
    if (priorityFromTopic(topic)) {
      cases.push(parseXmindCase(topic, nextVersion, cases.length + 1));
      return;
    }
    for (const child of topic.children?.attached ?? []) visit(child, nextVersion);
  }

  for (const sheet of sheets) visit(sheet.rootTopic);
  return cases;
}

function compareCases(archiveCases, xmindCases) {
  const issues = [];
  if (archiveCases.length !== xmindCases.length) {
    issues.push(`case count mismatch: archive=${archiveCases.length}, xmind=${xmindCases.length}`);
  }

  const xmindByKey = new Map();
  for (const testCase of xmindCases) {
    const key = `${testCase.version}\u0000${testCase.priority}\u0000${testCase.title}`;
    if (!xmindByKey.has(key)) xmindByKey.set(key, []);
    xmindByKey.get(key).push(testCase);
  }

  for (const archiveCase of archiveCases) {
    const key = `${archiveCase.version}\u0000${archiveCase.priority}\u0000${archiveCase.title}`;
    const candidates = xmindByKey.get(key);
    const xmindCase = candidates?.shift();
    const prefix = `case #${archiveCase.index} ${archiveCase.version} ${archiveCase.priority} ${archiveCase.title}`;
    if (!xmindCase) {
      issues.push(`${prefix}: missing matching xmind topic`);
      continue;
    }
    if (archiveCase.preconditions !== xmindCase.preconditions) {
      issues.push(`${prefix}: preconditions mismatch`);
    }
    if (archiveCase.steps.length !== xmindCase.steps.length) {
      issues.push(`${prefix}: step count mismatch archive=${archiveCase.steps.length}, xmind=${xmindCase.steps.length}`);
      continue;
    }
    for (let stepIndex = 0; stepIndex < archiveCase.steps.length; stepIndex += 1) {
      const archiveStep = archiveCase.steps[stepIndex];
      const xmindStep = xmindCase.steps[stepIndex];
      if (archiveStep.step !== xmindStep.step) {
        issues.push(`${prefix}: step ${stepIndex + 1} text mismatch`);
      }
      if (archiveStep.expected !== xmindStep.expected) {
        issues.push(`${prefix}: step ${stepIndex + 1} expected mismatch`);
      }
    }
  }

  for (const values of xmindByKey.values()) {
    for (const leftover of values) {
      issues.push(`extra xmind topic ${leftover.version} ${leftover.priority} ${leftover.title}`);
    }
  }
  return issues;
}

async function main() {
  const archive = argValue("--archive", defaultArchive);
  const xmind = argValue("--xmind", defaultXmind);
  const archiveCases = parseArchive(readFileSync(archive, "utf8"));
  const xmindCases = await parseXmind(xmind);
  const issues = compareCases(archiveCases, xmindCases);
  const summary = {
    archive,
    xmind,
    archiveCaseCount: archiveCases.length,
    xmindCaseCount: xmindCases.length,
    checkedFields: ["version", "priority", "title", "preconditions", "steps.step", "steps.expected"],
    issueCount: issues.length,
    issues: issues.slice(0, 20),
  };
  console.log(JSON.stringify(summary, null, 2));
  if (issues.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
