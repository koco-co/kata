import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "@shared/lib/paths.ts";

const REPO = repoRoot();
const SETTINGS = join(REPO, ".claude/settings.json");

interface HookEntry {
  type: string;
  command: string;
}
interface MatcherGroup {
  matcher: string;
  hooks: HookEntry[];
}

// 校验项目级 settings.json 把现成的 pre-*-guard 真正挂进 PreToolUse，
// 否则守卫只是磁盘上的死代码、不拦任何东西。
describe("项目级 settings.json 挂载 repos 只读守卫", () => {
  test(".claude/settings.json 存在且为合法 JSON", () => {
    expect(existsSync(SETTINGS)).toBe(true);
    expect(() => JSON.parse(readFileSync(SETTINGS, "utf8"))).not.toThrow();
  });

  const settings = existsSync(SETTINGS)
    ? (JSON.parse(readFileSync(SETTINGS, "utf8")) as {
        hooks?: Record<string, MatcherGroup[]>;
      })
    : {};
  const preToolUse = settings.hooks?.PreToolUse ?? [];
  const allCommands = Object.values(settings.hooks ?? {}).flatMap((groups) =>
    groups.flatMap((group) => group.hooks.map((hook) => hook.command)),
  );

  test("PreToolUse 把 Edit/Write 挂到 pre-edit-guard.ts", () => {
    const editGroup = preToolUse.find((g) => /Edit|Write/.test(g.matcher));
    expect(editGroup).toBeDefined();
    expect(editGroup?.hooks.some((h) => h.command.includes("pre-edit-guard.ts"))).toBe(true);
  });

  test("PreToolUse 把 Bash 挂到 pre-bash-guard.ts", () => {
    const bashGroup = preToolUse.find((g) => /Bash/.test(g.matcher));
    expect(bashGroup).toBeDefined();
    expect(bashGroup?.hooks.some((h) => h.command.includes("pre-bash-guard.ts"))).toBe(true);
  });

  test("挂载引用的 hook 文件真实存在（不悬空）", () => {
    expect(allCommands.length).toBeGreaterThan(0);
    for (const cmd of allCommands) {
      const m = cmd.match(/\.claude\/hooks\/([a-z-]+\.ts)/);
      expect(m).not.toBeNull();
      const fileName = m?.[1];
      if (fileName) {
        expect(existsSync(join(REPO, ".claude/hooks", fileName))).toBe(true);
      }
    }
  });

  test("所有 hook 脚本都已挂载（不保留磁盘死代码）", () => {
    const hookFiles = readdirSync(join(REPO, ".claude/hooks"))
      .filter((file) => file.endsWith(".ts"))
      .sort();
    const unwired = hookFiles.filter(
      (file) => !allCommands.some((command) => command.includes(`.claude/hooks/${file}`)),
    );
    expect(unwired).toEqual([]);
  });
});
