/** Public base URL of the app, used for OAuth callbacks and links in Telegram messages. */
export function appOrigin(fallback = "http://localhost:3000") {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return fallback;
}
