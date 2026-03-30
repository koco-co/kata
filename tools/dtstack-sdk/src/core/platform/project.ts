import type { DtStackClientLike } from "../http/client";

export interface Project {
  readonly id: number;
  readonly projectName: string;
  readonly projectAlias?: string;
}

export interface CreateProjectOptions {
  readonly name: string;
  readonly alias?: string;
  readonly ownerId?: number;
  readonly desc?: string;
  readonly engines?: ReadonlyArray<string>;
}

const ENGINE_TYPES_DEFAULT = [1, 10, 16] as const;

function buildEngineList(engines: ReadonlyArray<string>): Array<Record<string, unknown>> {
  const list: Array<Record<string, unknown>> = ENGINE_TYPES_DEFAULT.map((engineType) => ({
    createModel: 0,
    identity: "default",
    engineType,
  }));
  for (const eng of engines) {
    if (eng === "default") continue;
    list.push({ createModel: 0, identity: eng, identityAlias: eng, engineType: 21 });
  }
  return list;
}

export class ProjectApi {
  constructor(private readonly client: DtStackClientLike) {}

  async list(): Promise<Project[]> {
    const resp = await this.client.post<Project[]>("/api/rdos/common/project/getProjects", {});
    if (resp.code !== 1 || !resp.data) return [];
    return resp.data;
  }

  async findByName(name: string): Promise<Project | null> {
    const projects = await this.list();
    return projects.find((p) => p.projectName === name || p.projectAlias === name) ?? null;
  }

  async createProject(opts: CreateProjectOptions): Promise<void> {
    const body = {
      projectName: opts.name,
      projectAlias: opts.alias ?? opts.name,
      projectOwnerId: String(opts.ownerId ?? 1),
      projectDesc: opts.desc ?? "",
      scheduleStatus: 0,
      isAllowDownload: 1,
      projectEngineList: buildEngineList(opts.engines ?? []),
    };
    const resp = await this.client.post("/api/rdos/common/project/createProject", body);
    if (resp.code !== 1) throw new Error(`createProject failed: ${resp.message ?? "unknown"}`);
  }

  async ensureProject(opts: CreateProjectOptions): Promise<Project> {
    const existing = await this.findByName(opts.name);
    if (existing) return existing;
    await this.createProject(opts);
    const created = await this.findByName(opts.name);
    if (!created) throw new Error(`project ${opts.name} not found after create`);
    return created;
  }
}
