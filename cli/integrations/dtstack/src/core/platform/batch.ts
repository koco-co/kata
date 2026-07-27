import type { DtStackClientLike } from "../http/client";
import { isAlreadyExistsError, isMissingObjectError, splitSqlStatements } from "../sql";
import { BatchScriptRunner } from "./script";

export interface Project {
  readonly id: number;
  readonly projectName: string;
  readonly projectAlias?: string;
}

export interface BatchDatasource {
  readonly id: number;
  readonly dataName: string;
  readonly dataSourceType: number;
  readonly type?: number;
  readonly identity?: string;
  readonly schemaName?: string;
  readonly schema?: string;
  readonly jdbcUrl?: string;
  readonly dataJson?: {
    readonly jdbcUrl?: string;
    readonly url?: string;
    readonly username?: string;
  };
}

/** How to treat already-exists / missing-object errors during executeDDL. */
export interface ExecutePolicies {
  readonly onExists?: "warn" | "fail";
  readonly onMissing?: "warn" | "fail";
}

function toBase64(str: string): string {
  return Buffer.from(str, "utf-8").toString("base64");
}

function isCreateStatement(sql: string): boolean {
  const upper = sql.trimStart().toUpperCase();
  return upper.startsWith("CREATE ");
}

function isDropStatement(sql: string): boolean {
  const upper = sql.trimStart().toUpperCase();
  return upper.startsWith("DROP ");
}

function isInsertStatement(sql: string): boolean {
  const upper = sql.trimStart().toUpperCase();
  return upper.startsWith("INSERT ");
}

function extractSchemaFromJdbcUrl(jdbcUrl: string): string | undefined {
  try {
    const afterProtocol = jdbcUrl.split("//")[1];
    if (!afterProtocol) return undefined;
    const pathPart = afterProtocol.split("?")[0];
    const segments = pathPart.split("/");
    return segments.length > 1 ? segments[segments.length - 1] : undefined;
  } catch {
    return undefined;
  }
}

export function resolveSchemaName(ds: BatchDatasource): string | undefined {
  return (
    ds.schemaName ??
    ds.schema ??
    extractSchemaFromJdbcUrl(ds.jdbcUrl ?? "") ??
    extractSchemaFromJdbcUrl(ds.dataJson?.jdbcUrl ?? "")
  );
}

export function getDatasourceAliases(datasourceType: string): {
  readonly keywords: readonly string[];
  readonly typeIds: readonly number[];
} {
  const typeLower = datasourceType.toLowerCase();

  switch (typeLower) {
    case "sparkthrift":
      return {
        keywords: ["sparkthrift", "hadoop"],
        typeIds: [45],
      };
    case "doris":
      return {
        keywords: ["doris", "doris3"],
        typeIds: [119],
      };
    default:
      return {
        keywords: [typeLower],
        typeIds: [],
      };
  }
}

function qualifySqlTarget(stmt: string, targetSchema?: string | null): string {
  if (!targetSchema) return stmt;
  const schema = targetSchema.trim();
  if (!schema) return stmt;

  const qualify = (prefix: string, tableName: string): string => {
    if (tableName.includes(".")) return `${prefix}${tableName}`;
    return `${prefix}${schema}.${tableName}`;
  };

  if (isDropStatement(stmt)) {
    return stmt.replace(
      /^(\s*DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?)([A-Za-z][\w.]*)(?=\s|;|$)/i,
      (_match, prefix: string, tableName: string) => qualify(prefix, tableName),
    );
  }

  if (isCreateStatement(stmt)) {
    return stmt.replace(
      /^(\s*CREATE\s+(?:EXTERNAL\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?)([A-Za-z][\w.]*)(?=\s|\(|;|$)/i,
      (_match, prefix: string, tableName: string) => qualify(prefix, tableName),
    );
  }

  if (isInsertStatement(stmt)) {
    return stmt.replace(
      /^(\s*INSERT\s+(?:INTO|OVERWRITE)\s+(?:TABLE\s+)?)([A-Za-z][\w.]*)(?=\s|;|$)/i,
      (_match, prefix: string, tableName: string) => qualify(prefix, tableName),
    );
  }

  return stmt;
}

function extractQualifiedSchema(stmt: string): string | undefined {
  const match = stmt.match(
    /^\s*(?:DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?|CREATE\s+(?:EXTERNAL\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?|INSERT\s+(?:INTO|OVERWRITE)\s+(?:TABLE\s+)?)([A-Za-z][\w]*)\.[A-Za-z][\w]*/i,
  );
  return match?.[1];
}

export class BatchApi {
  private readonly scriptRunner: BatchScriptRunner;

  constructor(
    private readonly client: DtStackClientLike,
    cacheKey = "default",
  ) {
    this.scriptRunner = new BatchScriptRunner(client, cacheKey);
  }

  async findProject(name: string): Promise<Project | null> {
    const resp = await this.client.post<Project[]>("/api/rdos/common/project/getProjects", {});
    if (resp.code !== 1 || !resp.data) return null;
    const project = resp.data.find((p) => p.projectName === name || p.projectAlias === name);
    return project ?? null;
  }

  async getProjectDatasource(
    projectId: number,
    datasourceType: string,
    profile?: { id?: number; name?: string; typeId?: number; aliases?: readonly string[] },
  ): Promise<BatchDatasource | null> {
    const resp = await this.client.postWithProjectId<BatchDatasource[]>(
      "/api/rdos/batch/batchDataSource/list",
      { projectId, syncTask: true },
      projectId,
    );
    if (resp.code !== 1 || !resp.data) return null;

    // 优先使用 profile 中的精确 ID 和名称匹配。typeId 只能作为 fallback 过滤条件，
    // 不能单独命中，否则同类型存在多个数据源时会误选第一个。
    if (profile) {
      const exact = resp.data.find((d) => {
        if (profile.id && d.id === profile.id) return true;
        if (profile.name && d.dataName === profile.name) return true;
        return false;
      });
      if (exact) return exact;
    }

    // fallback 到 alias/typeID 模糊匹配
    const aliases = getDatasourceAliases(datasourceType);
    const keywords = [...new Set([...(profile?.aliases ?? []), ...aliases.keywords])].map((item) =>
      item.toLowerCase(),
    );
    const typeIds = [
      ...new Set([profile?.typeId, ...aliases.typeIds].filter((id): id is number => Boolean(id))),
    ];
    const ds = resp.data.find((d) => {
      if (d.identity && keywords.includes(d.identity.toLowerCase())) return true;
      if (d.dataName && keywords.some((keyword) => d.dataName.toLowerCase().includes(keyword))) {
        return true;
      }
      if (d.dataSourceType && typeIds.includes(d.dataSourceType)) return true;
      if (d.type && typeIds.includes(d.type)) return true;
      return false;
    });
    return ds ?? null;
  }

  private async executeSqlViaDdlApi(
    projectId: number,
    datasource: BatchDatasource,
    stmt: string,
    targetSchema: string,
  ): Promise<void> {
    const resp = await this.client.postWithProjectId(
      "/api/rdos/batch/batchTableInfo/ddlCreateTableEncryption",
      {
        sql: toBase64(stmt),
        sourceId: datasource.id,
        targetSchema,
        syncTask: true,
      },
      projectId,
    );
    if (resp.code !== 1) {
      throw new Error(resp.message ?? "unknown error");
    }
  }

  /**
   * 执行混合 SQL（DDL + DML）。
   * - CREATE 走 ddlCreateTableEncryption（直连 metastore，同步生效）
   * - DROP / INSERT / 其它 DML 走 batchScript/startSqlImmediatelyEncryption
   *   （提交 SQL 任务 → 轮询 selectStatus 直到终态，失败抛错）
   * - policies.onExists === "fail" 时 already-exists 错误抛错（默认 warn 跳过）
   * - policies.onMissing === "fail" 时 DROP 缺对象错误抛错（默认 warn 跳过）
   */
  async executeDDL(
    projectId: number,
    datasource: BatchDatasource,
    sql: string,
    schemaOverride?: string,
    policies: ExecutePolicies = {},
  ): Promise<void> {
    const targetSchema = schemaOverride ?? resolveSchemaName(datasource);
    const onExists = policies.onExists ?? "warn";
    const onMissing = policies.onMissing ?? "warn";

    const statements = splitSqlStatements(sql);

    for (const stmt of statements) {
      const isDrop = isDropStatement(stmt);
      const isCreate = isCreateStatement(stmt);
      const isInsert = isInsertStatement(stmt);
      const qualifiedStmt = qualifySqlTarget(stmt, targetSchema);
      const executionSchema = targetSchema ?? extractQualifiedSchema(qualifiedStmt);

      try {
        if (isCreate) {
          await this.executeSqlViaDdlApi(
            projectId,
            datasource,
            qualifiedStmt,
            executionSchema ?? "",
          );
        } else if (isInsert) {
          // INSERT 通过 scriptRunner，但表刚创建后引擎可能还看不到（catalog 同步延迟）；
          // 用 backoff 重试，避免 INSERT 静默失败导致校验跑在空表上。
          await this.executeWithRetry(
            () =>
              this.scriptRunner.executeSync(projectId, qualifiedStmt, undefined, {
                sourceId: datasource.id,
                targetSchema: executionSchema,
                syncTask: true,
              }),
            {
              attempts: 5,
              delayMs: 1500,
            },
          );
        } else if (isDrop) {
          // DROP 语句尝试执行，缺对象按 policies.onMissing 处理（默认 warn 跳过）
          try {
            await this.scriptRunner.executeSync(projectId, qualifiedStmt);
          } catch (dropError) {
            const dropMessage = (dropError as Error).message;
            if (isMissingObjectError(dropMessage)) {
              if (onMissing === "fail") {
                throw new Error(`SQL execution failed (DROP): ${dropMessage}`);
              }
              process.stderr.write(`[batch] DROP skipped (target missing): ${dropMessage}\n`);
            } else {
              process.stderr.write(`[batch] DROP warning: ${dropMessage}\n`);
            }
          }
        } else {
          // 其他语句通过 customSQL 执行
          await this.executeCustomSql(projectId, datasource, stmt, executionSchema ?? "");
        }
      } catch (err) {
        const message = (err as Error).message;
        if (isAlreadyExistsError(message)) {
          if (onExists === "fail") {
            throw new Error(`SQL execution failed (already exists): ${message}`);
          }
          process.stderr.write(`[batch] warning (already exists): ${message}\n`);
          continue;
        }

        // 对于 INSERT 语句，失败必须抛错
        if (isInsert) {
          throw new Error(`SQL execution failed (INSERT): ${message}`);
        }

        // 对于其他语句，尝试使用另一个 API 作为 fallback
        try {
          if (isCreate) {
            await this.executeCustomSql(
              projectId,
              datasource,
              qualifiedStmt,
              executionSchema ?? "",
            );
          } else {
            await this.executeSqlViaDdlApi(
              projectId,
              datasource,
              qualifiedStmt,
              executionSchema ?? "",
            );
          }
        } catch (fallbackError) {
          const details = [message, (fallbackError as Error).message].join(" | fallback: ");
          throw new Error(`SQL execution failed (DDL): ${details}`);
        }
      }
    }
  }

  private async executeCustomSql(
    projectId: number,
    datasource: BatchDatasource,
    stmt: string,
    targetSchema: string,
  ): Promise<void> {
    const resp = await this.client.postWithProjectId(
      "/api/rdos/batch/batchScript/startSqlImmediatelyEncryption",
      {
        sql: toBase64(stmt),
        sourceId: datasource.id,
        targetSchema,
        syncTask: true,
      },
      projectId,
    );
    if (resp.code !== 1) {
      throw new Error(resp.message ?? "unknown error");
    }
  }

  private async executeWithRetry(
    fn: () => Promise<void>,
    opts: { attempts: number; delayMs: number },
  ): Promise<void> {
    let lastError: Error | null = null;
    for (let i = 0; i < opts.attempts; i += 1) {
      try {
        await fn();
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < opts.attempts - 1) {
          const waitMs = opts.delayMs * (i + 1);
          process.stderr.write(
            `[batch] retry ${i + 1}/${opts.attempts} after ${waitMs}ms: ${lastError.message.slice(0, 100)}\n`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }
    throw lastError ?? new Error("retry failed");
  }
}
