# Grant Hunter

**A personal AI agent that hunts grants, bounties, hackathons and creator contests for you, verifies the terms, scores the fit, and drafts your application.**

Built for the **Nebius x NVIDIA Global AI Hackathon — Personal AI track**.

- **Live demo: https://grant-hunter-omega.vercel.app** (no sign-up: fill in your profile, then press **Hunt now**)
- Stack: Next.js 15 + Tailwind (App Router, API routes as the backend), Postgres (Neon on Vercel, embedded PGlite locally), Vercel Cron
- AI: **NVIDIA Nemotron** models served by **Nebius Token Factory**; web search by **Tavily**

## What it does

1. **Profile & memory.** You fill in skills, links, portfolio, country, timezone, rates, ecosystems and payout preferences. It is stored in Postgres. Every opportunity you save, apply to or reject (with an optional note such as "paid in an illiquid token") is remembered and fed back into future scores and drafts.
2. **Hunt.** On demand (**Hunt now**) and daily (Vercel Cron), the agent runs Tavily searches across Superteam Earn, Devpost, Gitcoin, X announcements, ecosystem grant pages and creator contests, plus 3 extra queries that Nemotron Nano plans from your profile.
3. **Verify & score.** Nemotron reads each page and extracts reward, deadline, eligibility, eligible countries, payout method, entry fee and how to apply. Every value must come with a verbatim quote, and the server checks that the quote is really on the page. If it isn't, the field becomes `unknown`. Deadlines are stored in UTC and shown in your timezone. Nemotron then scores fit 0-100 with plus/minus reasons and flags risks: country not eligible, paid in the sponsor's own token, entry fees, unclear terms, deadline passed. Listing pages and closed opportunities are dropped.
4. **Draft.** On any opportunity, Nemotron Ultra writes a tailored application, a pitch or an X thread from your profile and portfolio only. Nothing is submitted: you edit it, approve it, then copy it. Nemotron Ultra can also run a **deep fit analysis** (apply / maybe / skip, effort vs reward, what to verify).
5. **Dashboard.** A landing page at `/` explains the agent; the app lives at `/dashboard`: opportunities sorted by score or deadline, live countdowns, status (new / saved / applied / rejected), and a detail view with the verified terms, evidence quotes and sources.
6. **Daily digest.** "Today's top 5": ranked by fit with a boost for deadlines this week, with a one-line why and next step for each, written by Nemotron Super.

## How Nemotron, Token Factory and Tavily are used

All LLM calls go through `src/lib/llm.ts`, an OpenAI SDK client pointed at Nebius Token Factory (`https://api.tokenfactory.nebius.com/v1/`, key in `NEBIUS_API_KEY`). There are no other LLM providers in the code.

| Step | Model (Nebius Token Factory) | Code |
| --- | --- | --- |
| Plan profile-specific search queries | Nemotron Nano (`nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`) | `src/lib/hunt.ts` |
| Extract reward, deadline, eligibility, payout from each page (JSON, with evidence quotes) | Nemotron Nano | `src/lib/extract.ts` |
| Score fit 0-100 with reasons and risks, using profile + memory | Nemotron Super (`nvidia/nemotron-3-super-120b-a12b`) | `src/lib/score.ts` |
| Daily digest | Nemotron Super | `src/lib/digest.ts` |
| Deep fit analysis (reasoning on) | Nemotron Ultra (`nvidia/Nemotron-3-Ultra-550b-a55b`) | `src/lib/draft.ts` |
| Application / pitch / X-thread drafts | Nemotron Ultra | `src/lib/draft.ts` |

On first use the server reads Token Factory's `GET /v1/models` and picks, per tier, the newest Nemotron it serves (Nemotron 3 first, then the Llama-Nemotron / Nano v2 releases); see `MODEL_CANDIDATES` in `src/lib/llm.ts`. `/api/status` shows the models in use. Override with `NEMOTRON_NANO_MODEL`, `NEMOTRON_SUPER_MODEL` and `NEMOTRON_ULTRA_MODEL`. For older Nemotron releases reasoning is toggled with the system-prompt switch (`detailed thinking on/off`, or `/think` / `/no_think`), and `<think>` blocks are always stripped before parsing.

**Tavily** (`src/lib/tavily.ts`, key in `TAVILY_API_KEY`):

- Calls go through the official [`@tavily/core`](https://www.npmjs.com/package/@tavily/core) SDK (`src/lib/tavily.ts`).
- `search()` with `search_depth: "advanced"`, `include_raw_content: "markdown"`, `time_range: "month"` and per-source `include_domains` (e.g. `superteam.fun`, `devpost.com`, `gitcoin.co`, `x.com`). The raw page markdown is what Nemotron reads, so one call both finds and fetches the page.
- `extract()` as a fallback for results whose raw content is missing or too short.

### No invented fields

`src/lib/extract.ts` asks Nemotron for `{ value, evidence }` per field, with `"unknown"` when the page doesn't say. The server then normalises the page and the quote and drops any value whose evidence isn't found on the page. Deadlines without a stated timezone are flagged as such. Rule-based risks (sponsor token, entry fee, unclear terms, closed, excluded country) are computed from the verified fields in `src/lib/score.ts`, so the model can add risks but can't remove them.

## Run it locally

Requires Node 20+.

```bash
git clone https://github.com/PinnacleCryptNG/grant-hunter.git
cd grant-hunter
npm install
cp .env.example .env.local   # add NEBIUS_API_KEY and TAVILY_API_KEY
npm run dev                  # http://localhost:3000
```

Without `DATABASE_URL`, data is kept in an embedded Postgres (PGlite) under `./.data`. Open the app, fill in your profile under **Profile**, then press **Hunt now**.

Each browser gets its own anonymous user (cookie) with an empty profile. Hunting unlocks once the profile has at least one skill, interest or ecosystem.

## Tests

```bash
npm test          # vitest: evidence check, unknown fields, risk rules, score caps, hunt URL filters, digest ranking
npx tsc --noEmit && npm run lint
```

To run the whole pipeline offline (no Token Factory credits), `scripts/mock-token-factory.mjs` is a test-only stand-in for the chat completions endpoint. It also returns a made-up payout quote on some pages, so you can watch the evidence check turn it into `unknown`:

```bash
npm run mock:llm &                                   # http://localhost:4010/v1/
NEBIUS_API_KEY=mock NEBIUS_BASE_URL=http://localhost:4010/v1/ npm run dev
```

The deployed app always uses Nebius Token Factory.

## Deploy (Vercel)

1. Import the repo in Vercel (framework: Next.js).
2. Add a database: Vercel → Storage → Create Database → Neon. This injects `DATABASE_URL`. Tables are created automatically on first request.
3. Set env vars: `NEBIUS_API_KEY`, `TAVILY_API_KEY`, `CRON_SECRET` (any random string).
4. Deploy. `vercel.json` schedules `GET /api/cron` daily at 06:00 UTC: it hunts for up to 3 users active in the last 7 days who have daily hunting on and a filled-in profile, then refreshes their digest.

## API

| Route | Purpose |
| --- | --- |
| `GET/PUT /api/profile` | Read / save the profile |
| `POST /api/hunt` | Run a hunt now (Tavily → Nemotron extract → verify → score) |
| `GET /api/opportunities` | Scored opportunities for the current user |
| `GET/PATCH /api/opportunities/:id` | Detail + drafts / set status and feedback note |
| `POST /api/opportunities/:id/rescore` | Rescore with the latest profile and memory |
| `POST /api/opportunities/:id/analyze` | Deep fit analysis (Nemotron Ultra) |
| `POST/PATCH /api/opportunities/:id/draft` | Generate a draft (Nemotron Ultra) / edit or approve it |
| `GET /api/digest[?regenerate=1]` | Today's top 5 |
| `GET /api/cron` | Scheduled hunt + digest (needs `CRON_SECRET`) |
| `GET /api/status` | Which keys, models and database are configured |

## License

MIT, see [LICENSE](LICENSE).
