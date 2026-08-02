import crypto from "node:crypto";
import type { NotifyPluginConfig } from "../../lib/plugin-config.ts";
import {
  type NotificationCard,
  renderEmailCard,
  renderFeishuCard,
  renderMarkdownCard,
} from "./format.ts";
import type { NotificationEventType } from "./schema.ts";

export function configAllows(
  config: NotifyPluginConfig,
  event: NotificationEventType,
): string | undefined {
  if (config.is_enable === false) return "全局通知已关闭";
  if (!config.enabled_events || config.enabled_events.length === 0)
    return "enabled_events 未配置；未发送";
  if (!config.enabled_events.includes(event)) return `事件 ${event} 未在 enabled_events 中启用`;
  return undefined;
}

export type ChannelName = "dingtalk" | "feishu" | "wecom" | "email";
export type NotificationFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

class DeliveryError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

function buildDingtalkUrl(baseUrl: string, signSecret?: string): string {
  if (!signSecret) return baseUrl;
  const timestamp = Date.now();
  const sign = crypto
    .createHmac("sha256", signSecret)
    .update(`${timestamp}\n${signSecret}`)
    .digest("base64");
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
}

async function postJson(
  fetchImpl: NotificationFetch,
  url: string,
  body: unknown,
): Promise<Response> {
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new DeliveryError(`HTTP ${response.status}`, response.status >= 500);
    return response;
  } catch (error) {
    if (error instanceof DeliveryError) throw error;
    throw new DeliveryError("网络或超时错误", true);
  }
}

async function deliverDingtalk(
  config: NotifyPluginConfig,
  card: NotificationCard,
  fetchImpl: NotificationFetch,
): Promise<void> {
  const dingtalk = config.dingtalk;
  if (!dingtalk?.webhook_url) throw new DeliveryError("钉钉 webhook 未配置", false);
  const message = renderMarkdownCard(card);
  const response = await postJson(
    fetchImpl,
    buildDingtalkUrl(dingtalk.webhook_url, dingtalk.sign_secret),
    {
      msgtype: "markdown",
      markdown: {
        title: dingtalk.keyword ? `${dingtalk.keyword} ${message.title}` : message.title,
        text: message.text,
      },
    },
  );
  const result = (await response.json().catch(() => ({}))) as { errcode?: number };
  if (result.errcode && result.errcode !== 0)
    throw new DeliveryError(`钉钉业务错误 ${result.errcode}`, false);
}

async function deliverFeishu(
  config: NotifyPluginConfig,
  card: NotificationCard,
  fetchImpl: NotificationFetch,
): Promise<void> {
  const url = config.feishu?.webhook_url;
  if (!url) throw new DeliveryError("飞书 webhook 未配置", false);
  const response = await postJson(fetchImpl, url, renderFeishuCard(card));
  const result = (await response.json().catch(() => ({}))) as { code?: number };
  if (result.code && result.code !== 0)
    throw new DeliveryError(`飞书业务错误 ${result.code}`, false);
}

async function deliverWecom(
  config: NotifyPluginConfig,
  card: NotificationCard,
  fetchImpl: NotificationFetch,
): Promise<void> {
  const url = config.wecom?.webhook_url;
  if (!url) throw new DeliveryError("企微 webhook 未配置", false);
  const message = renderMarkdownCard(card);
  const response = await postJson(fetchImpl, url, {
    msgtype: "markdown",
    markdown: { content: message.text },
  });
  const result = (await response.json().catch(() => ({}))) as { errcode?: number };
  if (result.errcode && result.errcode !== 0)
    throw new DeliveryError(`企微业务错误 ${result.errcode}`, false);
}

async function deliverEmail(config: NotifyPluginConfig, card: NotificationCard): Promise<void> {
  const smtp = config.smtp;
  if (!smtp?.host || !smtp.user || !smtp.pass || !smtp.from || !smtp.to) {
    throw new DeliveryError("SMTP 配置不完整", false);
  }
  try {
    const nodemailer = await import("nodemailer");
    const message = renderEmailCard(card);
    const secure = smtp.secure === true || smtp.secure === "true";
    const transporter = nodemailer.default.createTransport({
      host: smtp.host,
      port: smtp.port ? Number(smtp.port) : 587,
      secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transporter.sendMail({
      from: smtp.from,
      to: smtp.to,
      subject: `[Kata] ${message.subject}`,
      text: message.text,
      html: message.html,
    });
  } catch {
    throw new DeliveryError("SMTP 网络或投递错误", true);
  }
}

export function enabledChannels(config: NotifyPluginConfig): ChannelName[] {
  const result: ChannelName[] = [];
  if (config.dingtalk?.is_enable !== false && config.dingtalk?.webhook_url) result.push("dingtalk");
  if (config.feishu?.is_enable !== false && config.feishu?.webhook_url) result.push("feishu");
  if (config.wecom?.is_enable !== false && config.wecom?.webhook_url) result.push("wecom");
  if (
    config.smtp?.is_enable !== false &&
    config.smtp?.host &&
    config.smtp.user &&
    config.smtp.pass &&
    config.smtp.from &&
    config.smtp.to
  )
    result.push("email");
  return result;
}

export async function deliverWithRetry(
  channel: ChannelName,
  config: NotifyPluginConfig,
  card: NotificationCard,
  fetchImpl: NotificationFetch,
): Promise<{ attempts: number; error?: string }> {
  for (let attempts = 1; attempts <= 3; attempts += 1) {
    try {
      if (channel === "dingtalk") await deliverDingtalk(config, card, fetchImpl);
      else if (channel === "feishu") await deliverFeishu(config, card, fetchImpl);
      else if (channel === "wecom") await deliverWecom(config, card, fetchImpl);
      else await deliverEmail(config, card);
      return { attempts };
    } catch (error) {
      const reason =
        error instanceof DeliveryError ? error : new DeliveryError("未知投递错误", false);
      if (!reason.retryable || attempts === 3) return { attempts, error: reason.message };
    }
  }
  return { attempts: 3, error: "未知投递错误" };
}
