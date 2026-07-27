// json-suite-preconditions.ts — json格式校验套件前置条件的可重试执行器
//
// 不同环境的批量项目名不一致（如 LTQC 用 "pw_test"、ltqcdev 用 "pw"），
// 前置建表需按候选项目名逐个尝试：某个项目成功即返回，全部失败才抛出错误。

/** 可重试前置条件执行参数。 */
export interface RetriablePreconditionsOptions {
  /** 数据源报告名（仅用于日志，如 "sparkthrift2.x"、"doris"）。 */
  readonly reportName: string;
  /** 候选批量项目名，按顺序逐个尝试。 */
  readonly projectNames: readonly string[];
  /** 重试间隔等待（由调用方注入可控实现，如 waitForUiSettled）。 */
  readonly wait: (ms: number) => Promise<void>;
  /** 日志输出（约定写入 stderr）。 */
  readonly log: (message: string) => void;
  /** 在指定项目下执行一次前置条件；抛错视为该项目失败。 */
  readonly runForProject: (projectName: string) => Promise<void>;
}

/** 相邻两次尝试之间的等待时长（毫秒）。 */
const RETRY_WAIT_MS = 3000;

/**
 * 按候选项目名逐个执行前置条件：成功即返回；失败记录日志并等待后试下一个；
 * 全部失败时抛出聚合错误。
 * 实现按调用点契约重建（fixtures/test-data.ts runSuitePreconditions），未经 live 验证。
 */
export async function runRetriablePreconditions(
  options: RetriablePreconditionsOptions,
): Promise<void> {
  const failures: string[] = [];
  for (const projectName of options.projectNames) {
    try {
      await options.runForProject(projectName);
      options.log(
        `[preconditions] ${options.reportName} preconditions complete (project="${projectName}").\n`,
      );
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`project="${projectName}": ${message}`);
      options.log(
        `[preconditions] ${options.reportName} project="${projectName}" failed: ${message.slice(0, 200)}\n`,
      );
      if (projectName !== options.projectNames[options.projectNames.length - 1]) {
        await options.wait(RETRY_WAIT_MS);
      }
    }
  }
  throw new Error(
    `[preconditions] ${options.reportName} 所有候选项目的前置条件均失败：${failures.join(" | ")}`,
  );
}
