// Points the Telegram bot at this app's webhook and registers its commands.
// Usage: TELEGRAM_BOT_TOKEN=... APP_URL=https://your-app node scripts/telegram-webhook.mjs
import { createHash } from "node:crypto";

const token = process.env.TELEGRAM_BOT_TOKEN;
const app = process.env.APP_URL?.replace(/\/$/, "");
if (!token || !app) throw new Error("Set TELEGRAM_BOT_TOKEN and APP_URL");
const secret = createHash("sha256").update(`grant-hunter-webhook:${token}`).digest("hex").slice(0, 48);
const call = async (method, body) => {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json();
  console.log(method, d.ok ? "ok" : d.description);
};
await call("setWebhook", { url: `${app}/api/telegram/webhook`, secret_token: secret, allowed_updates: ["message"], drop_pending_updates: true });
await call("setMyCommands", { commands: [{ command: "digest", description: "Send my latest top five" }, { command: "stop", description: "Stop daily digests" }] });
await call("setMyDescription", { description: "Grant Hunter is an AI agent that searches the web for grants, bounties, hackathons and creator contests that fit you. It checks every fact against its source, flags risks, and ranks matches against your profile.\n\nConnect this bot from your Grant Hunter profile and you'll get your top five every morning, with scores, deadlines and links.\n\n/digest sends the latest one. /stop turns it off." });
