/**
 * Read-only MCP tool registry backed by the kata catalog read layer.
 * Transport adapters should dispatch through this table without mutating workspaces.
 */
import {
  type FeatureFilters,
  getFeature,
  listFeatures,
  listProjectSummaries,
  listSkills,
  parseXmind,
  readTextArtifact,
} from "../core/catalog/index.ts";

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

function requiredString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required string argument: ${key}`);
  }
  return value;
}

function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid string argument: ${key}`);
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

function featureFilters(args: Record<string, unknown>): FeatureFilters {
  const filters: FeatureFilters = {};
  for (const key of FEATURE_FILTER_KEYS) {
    const value = optionalString(args, key);
    if (value !== undefined) {
      filters[key] = value;
    }
  }
  return filters;
}

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
      "List QA features in a project, optionally filtered by metadata or automation status.",
    inputSchema: {
      type: "object",
      properties: {
        automationStatus: { type: "string" },
        createdAfter: { type: "string", description: "yyyy-mm lower bound on created_at." },
        customer: { type: "string" },
        lastRun: { type: "string" },
        module: { type: "string" },
        owner: { type: "string" },
        project: { type: "string", description: "Project name from kata_list_projects." },
        status: { type: "string" },
        version: { type: "string" },
      },
      required: ["project"],
    },
    handler: (args) => listFeatures(requiredString(args, "project"), featureFilters(args)),
  },
  {
    name: "kata_get_feature",
    description: "Get metadata, manifest, available artifacts, and recent runs for a feature.",
    inputSchema: {
      type: "object",
      properties: {
        featureId: { type: "string", description: "Feature directory id." },
        project: { type: "string", description: "Project name from kata_list_projects." },
      },
      required: ["project", "featureId"],
    },
    handler: (args) =>
      getFeature(requiredString(args, "project"), requiredString(args, "featureId")),
  },
  {
    name: "kata_read_artifact",
    description: "Read an allowed text artifact from a feature directory.",
    inputSchema: {
      type: "object",
      properties: {
        featureId: { type: "string", description: "Feature directory id." },
        name: { type: "string", description: "Allowed artifact file name." },
        project: { type: "string", description: "Project name from kata_list_projects." },
      },
      required: ["project", "featureId", "name"],
    },
    handler: (args) =>
      readTextArtifact(
        requiredString(args, "project"),
        requiredString(args, "featureId"),
        requiredString(args, "name"),
      ),
  },
  {
    name: "kata_get_cases",
    description: "Read cases.xmind for a feature as a parsed topic tree.",
    inputSchema: {
      type: "object",
      properties: {
        featureId: { type: "string", description: "Feature directory id." },
        project: { type: "string", description: "Project name from kata_list_projects." },
      },
      required: ["project", "featureId"],
    },
    handler: (args) =>
      parseXmind(requiredString(args, "project"), requiredString(args, "featureId")),
  },
  {
    name: "kata_list_skills",
    description: "List kata QA skills with routing inputs, outputs, and trigger conditions.",
    inputSchema: { type: "object", properties: {} },
    handler: () => listSkills(),
  },
];

export const TOOL_BY_NAME: ReadonlyMap<string, ToolDef> = new Map(
  TOOLS.map((tool) => [tool.name, tool]),
);
