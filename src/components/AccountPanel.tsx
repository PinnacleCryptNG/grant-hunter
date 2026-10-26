"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Github, Loader2, LogOut, Send } from "lucide-react";
import { useMe } from "./useMe";

const ghost = "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-fg/70 ring-1 ring-white/15 transition hover:bg-white/5 hover:text-fg disabled:opacity-60";
const primary = "inline-flex items-center gap-2 rounded-full bg-lime px-4 py-1.5 text-sm font-semibold text-night transition hover:bg-lime-soft disabled:opacity-60";

function Row({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="mt-0.5 text-fg/50">{icon}</span>
        <div>
          <p className="text-sm font-medium text-fg">{title}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-fg/50">{body}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 pl-8 sm:pl-0">{children}</div>
    </div>
  );
}

/** Optional GitHub sign-in and Telegram delivery; the app works fully without either. */
export function AccountPanel() {
  const { me, refresh } = useMe();
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);
  useEffect(() => {
    if (me?.telegram && poll.current) {
      clearInterval(poll.current);
      poll.current = null;
      setLinking(false);
    }
  }, [me?.telegram]);

  if (!me || (!me.available.github && !me.available.telegram && !me.github)) return null;

  async function connectTelegram() {
    setError(null);
    const win = window.open("", "_blank");
    const r = await fetch("/api/telegram/link", { method: "POST" });
    const d = await r.json();
    if (!r.ok) {
      win?.close();
      return setError(d.error ?? "Couldn't start the Telegram link.");
    }
    if (win) win.location.href = d.url;
    else window.location.href = d.url;
    setLinking(true);
    let tries = 0;
    poll.current = setInterval(() => {
      if (++tries > 60 && poll.current) {
        clearInterval(poll.current);
        setLinking(false);
      }
      void refresh();
    }, 3000);
  }

  return (
    <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.08]">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-fg/45">Account &amp; delivery</h2>
      <div className="divide-y divide-white/[0.06]">
        {(me.available.github || me.github) && (
          <Row
            icon={<Github className="h-5 w-5" />}
            title={me.github ? `Signed in as @${me.github.login}` : "Keep your hunt on every device"}
            body={me.github ? "Your profile, saved opportunities and drafts are tied to your GitHub account." : "Optional. Sign in with GitHub and this profile, its history and drafts follow you to any browser."}
          >
            {me.github ? (
              <button type="button" className={ghost} onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }}>
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            ) : (
              <a href="/api/auth/github" className={primary}><Github className="h-4 w-4" /> Continue with GitHub</a>
            )}
          </Row>
        )}
        {me.available.telegram && (
          <Row
            icon={<Send className="h-5 w-5" />}
            title={me.telegram ? "Daily digest goes to Telegram" : "Get your top five on Telegram"}
            body={me.telegram ? `Every morning after the daily hunt, @${me.available.telegram} sends your top five. Send /stop to it anytime.` : linking ? "Tap Start in Telegram to finish. This updates on its own." : "One tap to connect. Every morning the bot sends your five best matches with deadlines and links."}
          >
            {me.telegram ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-sm text-lime"><Check className="h-4 w-4" /> Connected</span>
                <button type="button" className={ghost} onClick={async () => { await fetch("/api/telegram/link", { method: "DELETE" }); void refresh(); }}>Disconnect</button>
              </>
            ) : (
              <button type="button" className={primary} disabled={linking} onClick={connectTelegram}>
                {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {linking ? "Waiting for Telegram…" : "Connect Telegram"}
              </button>
            )}
          </Row>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </section>
  );
}
