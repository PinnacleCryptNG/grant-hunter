import { createHash, randomBytes } from "node:crypto";
import { one, query } from "./db";
import type { Digest } from "./digest";
import { appOrigin } from "./url";

const API = process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org";

export const telegramConfigured = () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME);
export const botUsername = () => process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") || null;

/** Telegram echoes this in X-Telegram-Bot-Api-Secret-Token so the webhook can reject forged updates. */
export function webhookSecret(token = process.env.TELEGRAM_BOT_TOKEN ?? "") {
  return createHash("sha256").update(`grant-hunter-webhook:${token}`).digest("hex").slice(0, 48);
}

export async function tg(method: string, body: object) {
  const res = await fetch(`${API}/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string; error_code?: number };
  if (!data.ok) throw Object.assign(new Error(`Telegram ${method}: ${data.description ?? res.status}`), { code: data.error_code ?? res.status });
  return data;
}

export const sendMessage = (chatId: string | number, html: string) =>
  tg("sendMessage", { chat_id: chatId, text: html, parse_mode: "HTML", link_preview_options: { is_disabled: true } });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function dueIn(deadline: string | null, now = Date.now()) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - now) / 86_400_000);
  if (Number.isNaN(days) || days < 0) return null;
  return days === 0 ? "due today" : days === 1 ? "due tomorrow" : `due in ${days} days`;
}

export function digestMessage(d: Digest, base: string, now = Date.now()) {
  const lines = [`<b>Grant Hunter · today's top ${d.items.length}</b>`, esc(clip(d.headline, 200)), ""];
  d.items.forEach((it, i) => {
    const meta = [it.score != null ? `score ${it.score}` : null, dueIn(it.deadline, now)].filter(Boolean).join(" · ");
    lines.push(`<b>${i + 1}.</b> <a href="${base}/o/${it.id}">${esc(clip(it.title, 120))}</a>${meta ? ` · ${meta}` : ""}`);
    if (it.why) lines.push(esc(clip(it.why, 280)));
    if (it.nextStep) lines.push(`→ ${esc(clip(it.nextStep, 200))}`);
    lines.push("");
  });
  lines.push(`<a href="${base}/digest">Open today's digest</a>`);
  return lines.join("\n");
}

/** Sends the digest to the user's linked chat, once per day unless forced. */
export async function deliverDigest(userId: string, d: Digest, { force = false } = {}) {
  if (!telegramConfigured()) return false;
  const u = await one<{ chat: string | null }>("SELECT telegram_chat_id::text AS chat FROM users WHERE id = $1", [userId]);
  if (!u?.chat) return false;
  if (!force) {
    const row = await one<{ delivered_at: string | null }>("SELECT delivered_at FROM digests WHERE user_id = $1 AND day = $2", [userId, d.day]);
    if (row?.delivered_at) return false;
  }
  try {
    await sendMessage(u.chat, digestMessage(d, appOrigin()));
  } catch (e) {
    // 403: the user blocked the bot, so stop trying.
    if ((e as { code?: number }).code === 403) await query("UPDATE users SET telegram_chat_id = NULL WHERE id = $1", [userId]);
    throw e;
  }
  await query("UPDATE digests SET delivered_at = now() WHERE user_id = $1 AND day = $2", [userId, d.day]);
  await query("INSERT INTO events (user_id, action) VALUES ($1, 'digest_sent')", [userId]);
  return true;
}

export async function createLinkCode(userId: string) {
  const code = randomBytes(12).toString("base64url");
  await query("UPDATE users SET telegram_link_code = $2, telegram_link_expires = now() + interval '15 minutes' WHERE id = $1", [userId, code]);
  return code;
}

type Update = { message?: { text?: string; chat?: { id: number } } };

export async function handleUpdate(update: Update) {
  const text = update.message?.text?.trim();
  const chat = update.message?.chat?.id;
  if (!text || !chat) return;
  const [cmd, arg] = text.split(/\s+/);
  if (cmd === "/start" && arg) {
    const u = await one<{ id: string }>(
      `UPDATE users SET telegram_chat_id = $2, telegram_link_code = NULL, telegram_link_expires = NULL
       WHERE telegram_link_code = $1 AND telegram_link_expires > now() RETURNING id`,
      [arg, chat],
    );
    if (!u) return void (await sendMessage(chat, "That link has expired. Open your Grant Hunter profile and tap <b>Connect Telegram</b> again."));
    await query("UPDATE users SET telegram_chat_id = NULL WHERE telegram_chat_id = $1 AND id <> $2", [chat, u.id]);
    await query("INSERT INTO events (user_id, action) VALUES ($1, 'telegram_linked')", [u.id]);
    return void (await sendMessage(chat, "Connected. Your top five will arrive here every morning after the daily hunt.\n\n/digest sends the latest one now. /stop turns it off."));
  }
  if (cmd === "/stop") {
    await query("UPDATE users SET telegram_chat_id = NULL WHERE telegram_chat_id = $1", [chat]);
    return void (await sendMessage(chat, "Stopped. No more digests here. You can reconnect from your Grant Hunter profile anytime."));
  }
  if (cmd === "/digest") {
    const row = await one<{ content: Digest }>(
      "SELECT d.content FROM digests d JOIN users u ON u.id = d.user_id WHERE u.telegram_chat_id = $1 ORDER BY d.day DESC LIMIT 1",
      [chat],
    );
    return void (await sendMessage(chat, row ? digestMessage(row.content, appOrigin()) : "No digest yet. Run a hunt in Grant Hunter first."));
  }
  await sendMessage(chat, `I deliver your daily Grant Hunter digest. Connect this chat from ${appOrigin()}/profile.\n\n/digest latest digest · /stop turn off`);
}
