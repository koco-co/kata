/**
 * BatchScript runner — 封装平台 SQL 执行的脚本流程
 *
 * 平台 BatchWorks 跑 INSERT/SELECT/DROP 等 DML 必须通过「临时查询」脚本，
 * 不像 CREATE TABLE 有专门的 DDL 接口。
 *
 * 流程：
 *   1. getCatalogue → 找 catalogueType="ScriptManager" 的叶子文件夹（动态发现 nodePid）
 *   2. addOrUpdateScriptEncryption → 用固定名字创建/更新一个脚本（动态发现 scriptId）
 *   3. startSqlImmediatelyEncryption → 提交 SQL，返回 jobId
 *   4. batchSelectSql/selectStatus → 轮询直到终态
 *
 * scriptId 在内存中按 (baseUrl, projectId) 缓存，避免重复创建。
 */
import type { DtStackClientLike } from "../http/client";

const SCRIPT_NAME = "__kata_precond__";

// BatchTaskStatus 终态码（来自平台 enum）
const TERMINAL_STATUS = new Set([5, 7, 8, 9, 12, 13]);
const SUCCESS_STATUS = new Set([5, 12]);

interface CatalogueNode {
  readonly id: number;
  readonly catalogueType?: string;
  readonly name?: string;
  readonly type?: string;
  readonly children?: readonly CatalogueNode[];
}

interface StartSqlResp {
  readonly jobId?: string;
  readonly msg?: string;
  readonly isContinue?: boolean;
  readonly status?: number;
  readonly result?: unknown;
}

interface StatusResp {
  readonly status?: number;
  readonly msg?: string;
}

function toBase64(s: string): string {
  return Buffer.from(s, "utf-8").toString("base64");
}

function findScriptFolder(node: CatalogueNode): CatalogueNode | null {
  // 优先匹配 catalogueType = "ScriptManager" 且无子目录的叶子节点
  if (node.catalogueType === "ScriptManager" && node.type === "folder") {
    const hasChildFolder = (node.children ?? []).some((c) => c.type === "folder");
    if (!hasChildFolder) return node;
  }
  for (const child of node.children ?? []) {
    const found = findScriptFolder(child);
    if (found) return found;
  }
  return null;
}

function findScriptFolderByName(node: CatalogueNode): CatalogueNode | null {
  // fallback：找名字为「临时查询」的 folder，兼容旧版 catalogueType
  if (node.name === "临时查询" && node.type === "folder") return node;
  for (const child of node.children ?? []) {
    const found = findScriptFolderByName(child);
    if (found) return found;
  }
  return null;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export class BatchScriptRunner {
  // 模块级缓存：避免同一项目重复创建脚本
  private static readonly scriptIdCache = new Map<string, number>();

  constructor(
    private readonly client: DtStackClientLike,
    private readonly cacheKey: string,
  ) {}

  private async getScriptManagerFolderId(projectId: number): Promise<number> {
    const resp = await this.client.postWithProjectId<CatalogueNode>(
      "/api/rdos/batch/batchCatalogue/getCatalogue",
      { catalogueType: 0, isGetFile: 0, nodePid: 0 },
      projectId,
    );
    if (resp.code !== 1 || !resp.data) {
      throw new Error(`getCatalogue failed: ${resp.message ?? "no data"}`);
    }
    const found = findScriptFolder(resp.data) ?? findScriptFolderByName(resp.data);
    if (!found) {
      throw new Error("ScriptManager folder not found in catalogue tree (临时查询)");
    }
    return found.id;
  }

  private async findExistingScriptId(projectId: number, nodePid: number): Promise<number | null> {
    // 拉 ScriptManager 文件夹下的子节点（含 file 类型的脚本）
    // catalogueType 必须传 "ScriptManager" 字符串才会返回 file 子节点
    const resp = await this.client.postWithProjectId<CatalogueNode>(
      "/api/rdos/batch/batchCatalogue/getCatalogue",
      { catalogueType: "ScriptManager", isGetFile: 1, nodePid },
      projectId,
    );
    if (resp.code !== 1 || !resp.data) return null;
    for (const child of resp.data.children ?? []) {
      if (child.name === SCRIPT_NAME && child.type === "file") return child.id;
    }
    return null;
  }

  private async ensureScriptId(projectId: number): Promise<number> {
    const key = `${this.cacheKey}::${projectId}`;
    const cached = BatchScriptRunner.scriptIdCache.get(key);
    if (cached) return cached;

    const nodePid = await this.getScriptManagerFolderId(projectId);

    // 已存在则复用，不存在再创建（避免「名称已经存在」错误）
    const existing = await this.findExistingScriptId(projectId, nodePid);
    if (existing) {
      BatchScriptRunner.scriptIdCache.set(key, existing);
      return existing;
    }

    const resp = await this.client.postWithProjectId<{ id?: number }>(
      "/api/rdos/batch/batchScript/addOrUpdateScriptEncryption",
      {
        name: SCRIPT_NAME,
        scriptText: toBase64("-- kata precond runner"),
        type: 0,
        appType: 1,
        nodePid,
        taskParams: "",
        lockVersion: 0,
        forceUpdate: false,
        isDeleted: 0,
        id: 0,
      },
      projectId,
    );
    if (resp.code !== 1 || !resp.data?.id) {
      throw new Error(`addOrUpdateScriptEncryption failed: ${resp.message ?? "no id"}`);
    }
    BatchScriptRunner.scriptIdCache.set(key, resp.data.id);
    return resp.data.id;
  }

  /**
   * 提交 SQL，返回 jobId。
   * 平台对不同 SQL 返回形态不同：
   *   - DDL（DROP/CREATE）→ 元数据直执行，无 jobId 也无 status，立即完成
   *   - 简单 SELECT → 同步返回 result + status=5，立即完成
   *   - DML（INSERT 等）→ 提交 engine job，返回 jobId，需轮询
   * 返回 null 表示已同步完成无需轮询，返回 string 表示需轮询的 jobId。
   * 失败（msg 里有错或显式 status=失败）抛错。
   */
  private async submitSql(
    projectId: number,
    scriptId: number,
    sql: string,
  ): Promise<string | null> {
    const resp = await this.client.postWithProjectId<StartSqlResp>(
      "/api/rdos/batch/batchScript/startSqlImmediatelyEncryption",
      {
        scriptId,
        sql: toBase64(sql),
        isCheckDDL: 0,
        taskParams: "",
        queryLimit: 1000,
      },
      projectId,
    );
    if (resp.code !== 1 || !resp.data) {
      throw new Error(`startSqlImmediately failed: ${resp.message ?? "no data"}`);
    }
    const data = resp.data;
    if (data.jobId) return data.jobId;

    // 同步完成路径：status=5/12 或没有 status（DDL 直执行成功）
    if (data.status !== undefined) {
      if (SUCCESS_STATUS.has(data.status)) return null;
      if (TERMINAL_STATUS.has(data.status)) {
        throw new Error(`SQL failed sync (status=${data.status} msg=${data.msg ?? ""})`);
      }
    }
    // 没有 jobId 也没有 status，但有 msg 说明有问题（如「脚本不存在」）
    if (data.msg) {
      throw new Error(`SQL submit rejected: ${data.msg}`);
    }
    // DDL inline 完成（无 jobId、无 status、无 msg）
    return null;
  }

  private async pollUntilDone(projectId: number, jobId: string, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastStatus = -1;
    while (Date.now() < deadline) {
      await sleep(2_000);
      const resp = await this.client.postWithProjectId<StatusResp>(
        "/api/rdos/batch/batchSelectSql/selectStatus",
        { jobId, type: 0 },
        projectId,
      );
      const status = resp.data?.status;
      if (status === undefined) continue;
      lastStatus = status;
      if (TERMINAL_STATUS.has(status)) {
        if (SUCCESS_STATUS.has(status)) return;
        throw new Error(
          `SQL job ${jobId} terminated with status=${status} msg=${resp.data?.msg ?? ""}`,
        );
      }
    }
    throw new Error(`SQL job ${jobId} timeout after ${timeoutMs}ms (last status=${lastStatus})`);
  }

  /**
   * 同步执行单条 SQL：提交 → 轮询 → 终态
   * 失败/超时抛错。
   */
  async executeSync(projectId: number, sql: string, timeoutMs = 180_000): Promise<void> {
    const scriptId = await this.ensureScriptId(projectId);
    try {
      const jobId = await this.submitSql(projectId, scriptId, sql);
      if (jobId) await this.pollUntilDone(projectId, jobId, timeoutMs);
    } catch (err) {
      // 缓存的 scriptId 可能被人删掉，下次重试时强制重建
      if (/脚本不存在|script.*not.*exist/i.test((err as Error).message)) {
        BatchScriptRunner.scriptIdCache.delete(`${this.cacheKey}::${projectId}`);
      }
      throw err;
    }
  }
}
