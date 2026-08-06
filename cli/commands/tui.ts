import type { Command } from "commander";
import { startTui } from "../lib/tui/index.ts";

export function registerTui(program: Command): void {
  program
    .command("tui")
    .description("进入全屏交互界面；TTY 下裸 kata 也会进入")
    .action(async () => {
      if (!process.stdin.isTTY) {
        throw new Error("kata tui 需要 TTY 终端");
      }
      await startTui();
    });
}
