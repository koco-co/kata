/**
 * kata MCP tool registry.
 *
 * Each tool exposes a slice of the kata engine's read surface so agents can
 * query the QA workspace structurally instead of crawling folders. The same
 * registry backs the in-platform agent (P3) and external Claude Code / Codex
 * via `claude -p --mcp-config`. Read-only — no tool mutates the workspace.
 */
import {
  getFeature,
  listFeatures,
  listProjectSummaries,
  parseXmind,
  readTextArtifact,
} from "../shared/catalog.ts";
import { listSkills } from "../shared/skills.ts";

export interface JsonSchema {
  readonly type: "object";
  readonly properties: Record<string, unknown>;
  readonly required?: readonly string[];
}

export interface ToolDef {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
  readonly handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

function str(args: Record<string, unknown>, key: string, required = true): string {
  const value = args[key];
  if (typeof value !== "string" || value === "") {
    if (required) throw new Error(`Missing required string argument: ${key}`);
    return "";
  }
  return value;
}

const FEATURE_FILTER_KEYS = [
  "module",
  "customer",
  "version",
  "owner",
  "createdAfter",
  "status",
  "automationStatus",
  "lastRun",
] as const;

export const TOOLS: readonly ToolDef[] = [
  {
    name: "kata_list_projects",
    description: "List kata workspace projects with their feature counts.",
    inputSchema: { type: "object", properties: {} },
    handler: () => listProjectSummaries(),
  },
  {
    name: "kata_list_features",
    description:
      "List QA features in a project. Returns id, display name, modules, status, automation status and last run. Supports filtering by module/customer/version/owner/status/automationStatus/lastRun.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Project name (see kata_list_projects)." },
        module: { type: "string" },
        customer: { type: "string" },
        version: { type: "string" },
        owner: { type: "string" },
        createdAfter: { type: "string", description: "yyyy-mm lower bound on created_at." },
        status: { type: "string" },
        automationStatus: { type: "string" },
        lastRun: { type: "string" },
      },
      required: ["project"],
    },
    handler: (args) => {
      const project = str(args, "project");
      const filters: Record<string, string> = {};
      for (const key of FEATURE_FILTER_KEYS) {
        const value = str(args, key, false);
        if (value) filters[key] = value;
      }
      return listFeatures(project, filters);
    },
  },
  {
    name: "kata_get_feature",
    description:
      "Get full detail for one feature: metadata.yaml, manifest.json, available artifacts and recent run ids.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string" },
        featureId: { type: "string", description: "e.g. 2026-02-dq-rule-task-edit-partition" },
      },
      required: ["project", "featureId"],
    },
    handler: (args) => getFeature(str(args, "project"), str(args, "featureId")),
  },
  {
    name: "kata_read_artifact",
    description:
      "Read a text artifact of a feature (archive.md, metadata.yaml, manifest.json, prd.md, enhanced.md, confirmation-package.md, unresolved-summary.md, source-facts.json, archive.draft.md, resolved.md).",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string" },
        featureId: { type: "string" },
        name: { type: "string", description: "Artifact file name from the allowed set." },
      },
      required: ["project", "featureId", "name"],
    },
    handler: (args) =>
      readTextArtifact(str(args, "project"), str(args, "featureId"), str(args, "name")),
  },
  {
    name: "kata_get_cases",
    description:
      "Get the test-case mind map (cases.xmind) of a feature parsed as a topic tree, including priority markers and notes.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string" },
        featureId: { type: "string" },
      },
      required: ["project", "featureId"],
    },
    handler: (args) => parseXmind(str(args, "project"), str(args, "featureId")),
  },
  {
    name: "kata_list_skills",
    description:
      "List kata QA skills (case-draft, case-edit, bug-file, ...) with their trigger conditions, inputs and outputs, so an agent can route work to the right skill.",
    inputSchema: { type: "object", properties: {} },
    handler: () => listSkills(),
  },
];

export const TOOL_BY_NAME: ReadonlyMap<string, ToolDef> = new Map(TOOLS.map((t) => [t.name, t]));
