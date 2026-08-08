import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { loadPlaywrightAutomationConfig } from "../../../runtime/automation/config/playwright.ts";
import { writeJsonAtomic } from "../atomic-writer.ts";
import { locateProjectRoot } from "../workspace-locator.ts";

export interface AllureServerRecord {
  runPath: string;
  reportDir: string;
  url: string;
  pid: number;
  startedAt: string;
}

export function allureServersFile(): string {
  return (
    process.env.KATA_ALLURE_SERVERS_FILE ??
    join(homedir(), ".config", "kata", "allure-servers.json")
  );
}

function allureBinary(): string {
  const local = resolve(
    locateProjectRoot(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "allure.cmd" : "allure",
  );
  return existsSync(local) ? local : "allure";
}

function isRecord(value: unknown): value is AllureServerRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.runPath === "string" &&
    typeof record.reportDir === "string" &&
    typeof record.url === "string" &&
    typeof record.pid === "number" &&
    typeof record.startedAt === "string"
  );
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function readAllureServers(file = allureServersFile()): AllureServerRecord[] {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord);
  } catch {
    return [];
  }
}

export function stopAllureServices(file = allureServersFile()): { stopped: number } {
  const records = readAllureServers(file);
  let stopped = 0;
  for (const record of records) {
    try {
      process.kill(record.pid, "SIGTERM");
      stopped += 1;
    } catch {
      // Already stopped.
    }
  }
  writeJsonAtomic(file, []);
  return { stopped };
}

function freePort(): Promise<number> {
  return new Promise((resolvePort, rejectPort) => {
    const server = createServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        const port = address.port;
        server.close(() => resolvePort(port));
      } else {
        server.close(() => rejectPort(new Error("无法分配本机端口")));
      }
    });
  });
}

function ensureReport(runPath: string): string {
  const config = loadPlaywrightAutomationConfig();
  const reportDir = join(runPath, config.allure.reportDir);
  const resultsDir = join(runPath, config.allure.resultsDir);
  if (!existsSync(join(reportDir, "index.html"))) {
    execFileSync(allureBinary(), ["generate", resultsDir, "-o", reportDir, "--clean"], {
      stdio: "ignore",
    });
  }
  return reportDir;
}

function openBrowser(url: string): void {
  if (process.platform !== "darwin") return;
  const child = spawn("open", [url], { detached: true, stdio: "ignore" });
  child.unref();
}

export async function openAllureReport(
  runPath: string,
  file = allureServersFile(),
): Promise<{ url: string; reused: boolean }> {
  const existing = readAllureServers(file).find((record) => record.runPath === runPath);
  if (existing && processAlive(existing.pid)) {
    openBrowser(existing.url);
    return { url: existing.url, reused: true };
  }

  const reportDir = ensureReport(runPath);
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(
    allureBinary(),
    ["open", reportDir, "--host", "127.0.0.1", "--port", String(port)],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
  const record: AllureServerRecord = {
    runPath,
    reportDir,
    url,
    pid: child.pid ?? 0,
    startedAt: new Date().toISOString(),
  };
  const next = [...readAllureServers(file).filter((item) => item.runPath !== runPath), record];
  writeJsonAtomic(file, next);
  openBrowser(url);
  return { url, reused: false };
}
