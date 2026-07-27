import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import type { Command } from "commander";
import type { IntermediateJson } from "../lib/intermediate-types.ts";
import { locateProjectRoot } from "../lib/workspace-locator.ts";
import { archiveToJson } from "../lib/xmind-archive.ts";
import { appendXmind, applyFoldingToFile, replaceXmind } from "../lib/xmind-io.ts";
import {
  buildL1Title,
  buildRootTitle,
  countCases,
  createXmind,
  createXmindReplacing,
  type OutputResult,
  type RenderOptions,
  validateInput,
  type WriteMode,
} from "../lib/xmind-render.ts";

// ─── 输入/输出路径校验：限制在仓库根内 ───

function resolveInsideRoot(input: string, root: string, what = "输入路径"): string {
  const abs = isAbsolute(input) ? resolve(input) : resolve(process.cwd(), input);
  if (abs !== root && !abs.startsWith(`${root}/`)) {
    throw new Error(`${what}越出仓库根: ${input}`);
  }
  return abs;
}

function parseWriteMode(mode: string): WriteMode {
  if (mode === "create" || mode === "append" || mode === "replace") return mode;
  throw new Error(`非法 --mode "${mode}"，可选 create|append|replace`);
}

// 从输入路径推导 workspace 项目目录(用于加载项目级 xmind 渲染规则);
// 不在 workspace/<project>/ 下的输入没有项目规则,用内置默认值。
function deriveProjectDir(inputPath: string, repoRoot: string): string | undefined {
  const prefix = `${join(repoRoot, "workspace")}/`;
  if (!inputPath.startsWith(prefix)) return undefined;
  const project = inputPath.slice(prefix.length).split("/")[0];
  return project ? join(prefix, project) : undefined;
}

interface GenerateOptions {
  input: string;
  output?: string;
  mode: string;
  project: string;
  version?: string;
  jsonOnly?: boolean;
  stepsAsNotes?: boolean;
}

async function processMdFile(
  mdPath: string,
  projectDir: string | undefined,
  project: string,
  version?: string,
  jsonOnly?: boolean,
  mode: WriteMode = "create",
  outputOverride?: string,
  renderOptions: RenderOptions = {},
): Promise<void> {
  const fname = basename(mdPath, ".md");
  const outDir = dirname(mdPath);

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const data = archiveToJson(mdPath, project, version);
  const caseCount = countCases(data.modules);

  if (jsonOnly) {
    // tmp/ 只在 --json-only 时需要,不为普通生成污染归档目录
    const tmpDir = join(outDir, "tmp");
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    const jsonPath = join(tmpDir, `${fname}.json`);
    writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`JSON: ${jsonPath} (${caseCount} cases)`);
    return;
  }

  const xmindPath = outputOverride ? resolve(outputOverride) : join(outDir, `${fname}.xmind`);

  try {
    if (mode === "create") {
      // create 模式下已存在则原子覆盖(与旧实现一致:archive → xmind 是再生型产物)
      await createXmindReplacing(data, xmindPath, projectDir, renderOptions);
    } else if (mode === "append") {
      await appendXmind(data, xmindPath, projectDir, renderOptions);
    } else {
      await replaceXmind(data, xmindPath, projectDir, renderOptions);
    }
    await applyFoldingToFile(xmindPath);
  } catch (err) {
    throw new Error(`处理 ${mdPath} 失败: ${err instanceof Error ? err.message : err}`);
  }

  console.log(`XMind: ${resolve(xmindPath)} (${caseCount} cases)`);
}

async function runJsonInput(
  inputPath: string,
  projectDir: string | undefined,
  opts: GenerateOptions,
  mode: WriteMode,
  repoRoot: string,
): Promise<void> {
  if (!opts.output) {
    throw new Error("JSON 输入必须显式给 --output");
  }
  const outputPath = resolveInsideRoot(opts.output, repoRoot, "输出路径");

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(inputPath, "utf8"));
  } catch (err) {
    throw new Error(`读取输入失败: ${err instanceof Error ? err.message : err}`);
  }
  validateInput(raw);
  const data = raw as IntermediateJson;
  const renderOptions: RenderOptions = { stepsAsNotes: opts.stepsAsNotes };

  if (mode === "create") {
    await createXmind(data, outputPath, projectDir, renderOptions);
  } else if (mode === "append") {
    await appendXmind(data, outputPath, projectDir, renderOptions);
  } else {
    await replaceXmind(data, outputPath, projectDir, renderOptions);
  }
  await applyFoldingToFile(outputPath);

  const result: OutputResult = {
    output_path: outputPath,
    mode,
    root_title: buildRootTitle(data.meta, projectDir),
    l1_title: buildL1Title(data.meta),
    case_count: countCases(data.modules),
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

/** Run the xmind generate verb: dir batch, .md → xmind, or .json → xmind. */
export async function runXmindGenerate(opts: GenerateOptions): Promise<void> {
  const repoRoot = locateProjectRoot();
  const mode = parseWriteMode(opts.mode);
  const inputPath = resolveInsideRoot(opts.input, repoRoot);
  const stat = statSync(inputPath);
  const projectDir = deriveProjectDir(inputPath, repoRoot);

  if (stat.isDirectory()) {
    const mdFiles = readdirSync(inputPath)
      .filter((name) => name.endsWith(".md"))
      .map((name) => join(inputPath, name));
    if (mdFiles.length === 0) {
      throw new Error(`目录内无 .md 文件: ${inputPath}`);
    }
    for (const mdFile of mdFiles) {
      await processMdFile(
        mdFile,
        projectDir,
        opts.project,
        opts.version,
        opts.jsonOnly,
        mode,
        undefined,
        {
          stepsAsNotes: opts.stepsAsNotes,
        },
      );
    }
    return;
  }

  const ext = extname(inputPath).toLowerCase();
  if (ext === ".md") {
    // --output 同样限制在仓库根内,避免写出项目外
    const output = opts.output ? resolveInsideRoot(opts.output, repoRoot, "输出路径") : undefined;
    await processMdFile(
      inputPath,
      projectDir,
      opts.project,
      opts.version,
      opts.jsonOnly,
      mode,
      output,
      { stepsAsNotes: opts.stepsAsNotes },
    );
    return;
  }

  await runJsonInput(inputPath, projectDir, opts, mode, repoRoot);
}

// ─── commander 注册 ───

/** Register the xmind noun (generate) on the program. */
export function registerXmind(program: Command): void {
  const xmind = program.command("xmind").description("XMind 产物操作");

  xmind
    .command("generate")
    .description("将 Archive Markdown 或中间 JSON 转换为 .xmind 文件")
    .requiredOption("--input <path>", "输入 JSON / MD 文件 / MD 目录")
    .option("--output <path>", "输出 .xmind 路径（MD 输入可自动派生）")
    .option("--mode <mode>", "写入模式: create|append|replace", "create")
    .option(
      "--project <name>",
      "XMind 根节点项目名（默认 数栈测试；workspace/dataAssets 归档规则文档依赖该默认值，跨项目使用请显式传入）",
      "数栈测试",
    )
    .option("--version <ver>", "PRD 版本（如 6.4.9），用于根节点标题模板")
    .option("--json-only", "只输出中间 JSON（仅 MD 输入）")
    .option("--steps-as-notes", "步骤/预期写进备注而非大纲子节点")
    .action(async (opts: GenerateOptions) => {
      await runXmindGenerate(opts);
    });
}
