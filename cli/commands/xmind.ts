import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { Command } from "commander";
import type { IntermediateJson } from "../lib/intermediate-types.ts";
import { archiveToJson } from "../lib/xmind-archive.ts";
import { appendXmind, applyFoldingToFile, replaceXmind } from "../lib/xmind-io.ts";
import {
  buildL1Title,
  buildRootTitle,
  countCases,
  createXmind,
  type OutputResult,
  type RenderOptions,
  validateInput,
  type WriteMode,
} from "../lib/xmind-render.ts";
import { locateProjectRoot } from "../lib/workspace-locator.ts";

// ─── 输入路径校验：限制在仓库根内 ───

function resolveInsideRoot(input: string, root: string): string {
  const abs = isAbsolute(input) ? resolve(input) : resolve(process.cwd(), input);
  if (abs !== root && !abs.startsWith(`${root}/`)) {
    throw new Error(`输入路径越出仓库根: ${input}`);
  }
  return abs;
}

function parseWriteMode(mode: string): WriteMode {
  if (mode === "create" || mode === "append" || mode === "replace") return mode;
  throw new Error(`非法 --mode "${mode}"，可选 create|append|replace`);
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
  rulesRoot: string,
  project: string,
  version?: string,
  jsonOnly?: boolean,
  mode: WriteMode = "create",
  outputOverride?: string,
  renderOptions: RenderOptions = {},
): Promise<void> {
  const fname = basename(mdPath, ".md");
  const outDir = dirname(mdPath);
  const tmpDir = join(outDir, "tmp");

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const data = archiveToJson(mdPath, project, version);
  const caseCount = countCases(data.modules);

  if (jsonOnly) {
    const jsonPath = join(tmpDir, `${fname}.json`);
    writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`JSON: ${jsonPath} (${caseCount} cases)`);
    return;
  }

  const xmindPath = outputOverride ? resolve(outputOverride) : join(outDir, `${fname}.xmind`);

  try {
    if (mode === "create") {
      // create 模式下已存在则先删（与旧实现一致：archive → xmind 是再生型产物）
      if (existsSync(xmindPath)) unlinkSync(xmindPath);
      await createXmind(data, xmindPath, rulesRoot, project, renderOptions);
    } else if (mode === "append") {
      await appendXmind(data, xmindPath, rulesRoot, project, renderOptions);
    } else {
      await replaceXmind(data, xmindPath, rulesRoot, project, renderOptions);
    }
    await applyFoldingToFile(xmindPath);
  } catch (err) {
    throw new Error(`处理 ${mdPath} 失败: ${err instanceof Error ? err.message : err}`);
  }

  console.log(`XMind: ${resolve(xmindPath)} (${caseCount} cases)`);
}

async function runJsonInput(
  inputPath: string,
  rulesRoot: string,
  opts: GenerateOptions,
  mode: WriteMode,
): Promise<void> {
  if (!opts.output) {
    throw new Error("JSON 输入必须显式给 --output");
  }
  const outputPath = resolve(opts.output);

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
    await createXmind(data, outputPath, rulesRoot, opts.project, renderOptions);
  } else if (mode === "append") {
    await appendXmind(data, outputPath, rulesRoot, opts.project, renderOptions);
  } else {
    await replaceXmind(data, outputPath, rulesRoot, opts.project, renderOptions);
  }
  await applyFoldingToFile(outputPath);

  const result: OutputResult = {
    output_path: outputPath,
    mode,
    root_title: buildRootTitle(data.meta, rulesRoot, opts.project),
    l1_title: buildL1Title(data.meta),
    case_count: countCases(data.modules),
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

/** Run the xmind generate verb: dir batch, .md → xmind, or .json → xmind. */
export async function runXmindGenerate(opts: GenerateOptions): Promise<void> {
  const rulesRoot = locateProjectRoot();
  const mode = parseWriteMode(opts.mode);
  const inputPath = resolveInsideRoot(opts.input, rulesRoot);
  const stat = statSync(inputPath);

  if (stat.isDirectory()) {
    const mdFiles = readdirSync(inputPath)
      .filter((name) => name.endsWith(".md"))
      .map((name) => join(inputPath, name));
    if (mdFiles.length === 0) {
      throw new Error(`目录内无 .md 文件: ${inputPath}`);
    }
    for (const mdFile of mdFiles) {
      await processMdFile(mdFile, rulesRoot, opts.project, opts.version, opts.jsonOnly, mode, undefined, {
        stepsAsNotes: opts.stepsAsNotes,
      });
    }
    return;
  }

  const ext = extname(inputPath).toLowerCase();
  if (ext === ".md") {
    await processMdFile(
      inputPath,
      rulesRoot,
      opts.project,
      opts.version,
      opts.jsonOnly,
      mode,
      opts.output,
      { stepsAsNotes: opts.stepsAsNotes },
    );
    return;
  }

  await runJsonInput(inputPath, rulesRoot, opts, mode);
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
    .option("--project <name>", "XMind 根节点项目名", "数栈测试")
    .option("--version <ver>", "PRD 版本（如 6.4.9），用于根节点标题模板")
    .option("--json-only", "只输出中间 JSON（仅 MD 输入）")
    .option("--steps-as-notes", "步骤/预期写进备注而非大纲子节点")
    .action(async (opts: GenerateOptions) => {
      await runXmindGenerate(opts);
    });
}
