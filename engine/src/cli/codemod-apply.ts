import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  fixStandaloneTruthy,
  fixTruthyCorruption,
} from "@shared/lib/codemod/fix-truthy-corruption.ts";
import { transformNodeTestToBunTest } from "@shared/lib/codemod/node-test-to-bun-test.ts";
import { stripMatcherMessage } from "@shared/lib/codemod/strip-matcher-message.ts";
import { repoRoot } from "@shared/lib/paths.ts";
import { Command } from "commander";

function findTestFiles(root: string, out: string[], indicator: RegExp): void {
  try {
    const st = statSync(root);
    if (st.isFile() && root.endsWith(".test.ts")) {
      const content = readFileSync(root, "utf8");
      if (indicator.test(content)) out.push(root);
      return;
    }
    if (!st.isDirectory()) return;
    if (root.includes("/node_modules/") || root.includes("/dist/")) return;
    for (const e of readdirSync(root, { withFileTypes: true })) {
      findTestFiles(join(root, e.name), out, indicator);
    }
  } catch {
    /* skip */
  }
}

export function buildCodemodCommand(): Command {
  const codemod = new Command("codemod").description("Codemod 转换操作");
  codemod
    .command("node-test")
    .description("转换引擎测试文件（node:test→bun:test 等）")
    .option("--apply", "write changes (default: dry-run)", false)
    .option("--scope <p>", "scan path", join(repoRoot(), "engine"))
    .option("--mode <m>", "transformation mode (node-test|strip-msg|fix-truthy)", "node-test")
    .action((opts: { apply: boolean; scope: string; mode: string }) => {
      const isStrip = opts.mode === "strip-msg";
      const isFixTruthy = opts.mode === "fix-truthy";
      const transform = isStrip
        ? stripMatcherMessage
        : isFixTruthy
          ? (s: string) => fixStandaloneTruthy(fixTruthyCorruption(s))
          : transformNodeTestToBunTest;
      const indicator = isStrip
        ? /\.(toBe|toEqual|toMatch|toThrow)\([^)]*,/
        : isFixTruthy
          ? /expect\(.*\.toBeTruthy\(\)|\.toBeTruthy\(\)/
          : /from "node:test"/;

      const files: string[] = [];
      if (isFixTruthy) {
        // fix-truthy must scan both engine/tests/ and engine/src/**/__tests__/
        findTestFiles(join(repoRoot(), "engine", "tests"), files, indicator);
        findTestFiles(join(repoRoot(), "engine", "src"), files, indicator);
      } else {
        findTestFiles(opts.scope, files, indicator);
      }
      let changed = 0;
      for (const f of files) {
        const before = readFileSync(f, "utf8");
        const after = transform(before);
        if (after !== before) {
          changed++;
          if (opts.apply) writeFileSync(f, after);
          console.log(`${opts.apply ? "[wrote]" : "[dry]"} ${f.replace(repoRoot(), ".")}`);
        }
      }
      console.log(
        `\n[codemod:node-test --mode ${opts.mode}] candidates=${files.length} changed=${changed} apply=${opts.apply}`,
      );
    });
  return codemod;
}
