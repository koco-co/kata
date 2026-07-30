import type { Command } from "commander";
import {
  assertValidNotification,
  describeEvent,
  formatMarkdownMessage,
  listAllEvents,
  listNotificationLedgers,
  type NotificationData,
  type NotificationEventType,
  retryNotification,
  showNotificationLedger,
} from "../integrations/notify.ts";

function parsePreviewData(raw: string): NotificationData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("--data 必须是 JSON 对象");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--data 必须是 JSON 对象");
  }
  return parsed as NotificationData;
}

/** Build the notification inspection surface. It intentionally contains no real-send command. */
export function registerNotify(program: Command): void {
  const notify = program.command("notify").description("业务通知预览、查询与失败重试");

  notify
    .command("preview")
    .description("仅校验并预览固定业务事件内容；绝不发送通知")
    .option("-e, --event <type>", "业务事件类型")
    .option("-d, --data <json>", "严格符合事件 schema 的 JSON 对象")
    .option("--list-events", "列出支持的业务事件")
    .option("--describe <event>", "显示一个事件的字段契约")
    .addHelpText(
      "after",
      `\n支持事件:\n${listAllEvents()}\n\n使用 --describe <event> 查看严格字段契约。\n`,
    )
    .action((opts: { event?: string; data?: string; listEvents?: boolean; describe?: string }) => {
      if (opts.listEvents) {
        process.stdout.write(`${listAllEvents()}\n`);
        return;
      }
      if (opts.describe) {
        process.stdout.write(`${describeEvent(opts.describe)}\n`);
        return;
      }
      if (!opts.event || !opts.data) throw new Error("preview 必须同时提供 --event 与 --data");
      const data = parsePreviewData(opts.data);
      assertValidNotification(opts.event, data);
      const message = formatMarkdownMessage(opts.event as NotificationEventType, data);
      process.stdout.write(
        `${JSON.stringify({ preview: true, event: opts.event, ...message }, null, 2)}\n`,
      );
    });

  notify
    .command("list")
    .description("只读列出项目的本地通知账本")
    .requiredOption("--project <name>", "项目名")
    .action((opts: { project: string }) => {
      process.stdout.write(`${JSON.stringify(listNotificationLedgers(opts.project), null, 2)}\n`);
    });

  notify
    .command("show <event-id>")
    .description("只读查看一个本地通知账本（不含渠道凭据）")
    .requiredOption("--project <name>", "项目名")
    .action((eventId: string, opts: { project: string }) => {
      process.stdout.write(
        `${JSON.stringify(showNotificationLedger(eventId, opts.project), null, 2)}\n`,
      );
    });

  notify
    .command("retry <event-id>")
    .description("按账本重试此前失败的渠道；不会接受自定义内容")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--confirmed", "确认按当前配置重试失败渠道")
    .action(async (eventId: string, opts: { project: string; confirmed: boolean }) => {
      if (!opts.confirmed) throw new Error("重试通知必须显式提供 --confirmed");
      const result = await retryNotification(eventId, opts.project);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    });
}
