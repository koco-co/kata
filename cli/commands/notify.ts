import type { Command } from "commander";
import { listAllEvents, runSend } from "../integrations/notify.ts";

/** Build the `notify` command: IM/邮件通知发送(钉钉/飞书/企微/SMTP)。 */
export function registerNotify(program: Command): void {
  const notify = program.command("notify").description("IM/邮件通知集成");

  notify
    .command("send")
    .description("发送通知(钉钉/飞书/企微/邮件,按 config/plugin/notify.yaml 配置的渠道)")
    .option("-e, --event <type>", "事件类型(使用 --list-events 查看所有)")
    .option("-d, --data <json>", "事件数据(JSON 字符串,字段见 --describe <event>)", "{}")
    .option("--dry-run", "仅格式化消息,不实际发送")
    .option("--list-events", "列出所有支持的事件类型")
    .option("--describe <event>", "打印某个事件支持的字段、类型和必填项")
    .option("--strict", "未知字段或缺失必填字段时直接失败(默认仅告警)")
    .addHelpText(
      "after",
      `
${listAllEvents()}

示例:
  $ kata notify send --list-events
  $ kata notify send --describe ui-test-needs-input
  $ kata notify send --event case-generated --data '{"count":42,"file":"test.xmind"}'
  $ kata notify send --dry-run --event workflow-failed --data '{"step":"writer","reason":"timeout"}'
`,
    )
    .action(
      async (opts: {
        event?: string;
        data: string;
        dryRun?: boolean;
        listEvents?: boolean;
        describe?: string;
        strict?: boolean;
      }) => {
        const exitCode = await runSend(opts);
        if (exitCode !== 0) process.exitCode = exitCode;
      },
    );
}
