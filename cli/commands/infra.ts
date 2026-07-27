import { resolve } from "node:path";
import type { Command } from "commander";
import { outputJson } from "../lib/cli.ts";
import {
  readInfraConfig,
  runConfigDoctor,
  trustHostKey,
  writeCredentialProfile,
} from "../lib/infra-config.ts";
import { lintInfraMarkdown, writeInfraReport } from "../lib/infra-report.ts";
import { checkSshConnectivity } from "../lib/infra-ssh.ts";
import { assertReportSlug } from "../lib/paths.ts";

function readSecret(prompt: string, forceStdin = false): Promise<string> {
  if (forceStdin || !process.stdin.isTTY) {
    return new Promise((resolveSecret, reject) => {
      let value = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        value += String(chunk);
      });
      process.stdin.on("end", () => {
        const secret = value.trimEnd();
        if (!secret) reject(new Error("password input is empty"));
        else resolveSecret(secret);
      });
      process.stdin.resume();
    });
  }
  return new Promise((resolveSecret, reject) => {
    const stdin = process.stdin;
    const stdout = process.stderr;
    const wasRaw = stdin.isRaw;
    stdout.write(prompt);
    stdin.setRawMode?.(true);
    stdin.resume();
    let value = "";
    const onData = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      if (text === "\u0003") {
        cleanup();
        reject(new Error("password input cancelled"));
        return;
      }
      if (text === "\r" || text === "\n") {
        cleanup();
        stdout.write("\n");
        if (!value) reject(new Error("password input is empty"));
        else resolveSecret(value);
        return;
      }
      if (text === "\u007f") {
        value = value.slice(0, -1);
        return;
      }
      value += text;
    };
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode?.(wasRaw ?? false);
      stdin.pause();
    };
    stdin.on("data", onData);
  });
}

export function registerInfra(program: Command): void {
  const infra = program.command("infra").description("基础设施配置和 SSH connectivity 检查");

  infra
    .command("lint")
    .description("校验基础设施 Markdown 报告结构")
    .requiredOption("--report <path>", "infra Markdown 报告路径")
    .option("--exit-code", "存在 violation 时退出码为 1")
    .action((opts: { report: string; exitCode?: boolean }) => {
      const report = resolve(opts.report);
      const violations = lintInfraMarkdown(report);
      for (const violation of violations) {
        process.stderr.write(
          `${opts.report}:${violation.line}:${violation.rule}:${violation.message}\n`,
        );
      }
      outputJson({ report: opts.report, violations: violations.length });
      if (opts.exitCode && violations.length > 0) process.exitCode = 1;
    });

  const credentials = infra.command("credentials").description("管理本机 Credential Profile");
  credentials
    .command("set <name>")
    .description("交互式录入密码，不接受命令行密码参数")
    .requiredOption("--username <username>", "认证用户名")
    .option("--stdin", "从 stdin 读取密码，不回显")
    .action(async (name: string, opts: { username: string; stdin?: boolean }) => {
      if (!opts.stdin && !process.stdin.isTTY) {
        throw new Error("non-interactive credential input requires --stdin");
      }
      const password = await readSecret(opts.stdin ? "" : "Password: ", opts.stdin);
      const path = writeCredentialProfile(name, {
        kind: "password",
        username: opts.username,
        password,
      });
      outputJson({ ok: true, name, path });
    });

  infra
    .command("trust-host <host>")
    .description("显式记录已核验的 SSH host fingerprint")
    .requiredOption("--fingerprint <fingerprint>", "SHA256 fingerprint")
    .action((host: string, opts: { fingerprint: string }) => {
      const path = trustHostKey(host, opts.fingerprint);
      outputJson({ ok: true, host, path });
    });

  infra
    .command("inspect <host>")
    .description("执行受控的 SSH connectivity 检查并生成 infra Markdown 报告")
    .requiredOption("--check <check>", "目前只支持 connectivity")
    .requiredOption("--project <project>", "项目工作区")
    .option("--slug <slug>", "报告 slug")
    .option("--dry-run", "只解析配置，不连接服务器")
    .action(
      async (
        hostName: string,
        opts: { check: string; project: string; slug?: string; dryRun?: boolean },
      ) => {
        if (opts.check !== "connectivity") throw new Error("目前只支持 --check connectivity");
        const doctor = runConfigDoctor({ scope: "infra" });
        if (!doctor.ok)
          throw new Error(doctor.issues.map((item) => `${item.path}: ${item.message}`).join("; "));
        const config = readInfraConfig();
        const host = config.hosts[hostName];
        if (!host) throw new Error(`unknown infrastructure host: ${hostName}`);
        const credential = config.credentials[host.credential_ref];
        if (!credential) throw new Error(`credential profile not found: ${host.credential_ref}`);
        if (opts.dryRun) {
          outputJson({
            dry_run: true,
            host: hostName,
            target: `${host.host}:${host.port}`,
            credential_ref: host.credential_ref,
            host_key_configured: Boolean(host.host_key),
          });
          return;
        }
        const result = await checkSshConnectivity({
          host: host.host,
          port: host.port,
          username: credential.username,
          password: credential.password,
          expectedFingerprint: host.host_key,
        });
        const status = result.ok ? "diagnosed" : "blocked";
        const slug = opts.slug ?? `ssh-connectivity-${hostName}`;
        assertReportSlug(slug);
        const report = writeInfraReport({
          project: opts.project,
          slug,
          hostName,
          status,
          evidence: [
            `SSH result: ${result.ok ? "ready" : (result.code ?? "failed")}`,
            result.message ?? "SSH client completed the connectivity check.",
          ],
          conclusion: result.ok
            ? "SSH connectivity succeeded; original business path was not tested."
            : "SSH connectivity was not verified; inspect the redacted error and configuration binding.",
          fingerprint: result.fingerprint,
        });
        outputJson({
          ok: result.ok,
          status,
          report,
          host: hostName,
          fingerprint: result.fingerprint,
        });
        if (!result.ok) process.exitCode = 1;
      },
    );
}
