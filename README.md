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

### Agent trace, structured output and limits

- **Agent trace:** every Nemotron and Tavily call is logged to `agent_steps` (operation, model, tokens, time, success) by `src/lib/trace.ts`. Each opportunity page shows the calls made for it.
- **Structured output:** extraction, scoring and search planning send a strict JSON schema (`src/lib/schemas.ts`) as `response_format: json_schema`. If Token Factory or the model rejects it, `chatJson` falls back to JSON mode, then to plain text, and remembers which models don't support it.
- **Background hunts:** `POST /api/hunt` creates a `hunts` row and runs the hunt after responding; the dashboard polls `GET /api/hunt?id=` for live stage and counts. The daily cron starts a separate `/api/cron/hunt` call per user, each with its own time limit, and retries once.
- **Rate limits:** hunts and Nemotron Ultra/Super requests are capped per visitor, per IP and site-wide per day, with counters in Postgres (`src/lib/ratelimit.ts`). Defaults: 4 hunts/hour per visitor, 8 per IP, 200/day site-wide; 20 AI requests/hour per visitor, 40 per IP, 1000/day. Override with `HUNT_LIMIT_PER_USER_HOUR`, `HUNT_LIMIT_PER_IP_HOUR`, `HUNT_LIMIT_PER_DAY`, `LLM_LIMIT_PER_USER_HOUR`, `LLM_LIMIT_PER_IP_HOUR`, `LLM_LIMIT_PER_DAY`.

### Memory, re-checks and grant-hub crawling

- **Embedding memory:** when scoring, drafting or analysing an opportunity, `src/lib/memory.ts` embeds it and the user's past saved, applied and rejected opportunities through Token Factory's embeddings API (an NVIDIA embedding model if listed, else Qwen3-Embedding / BGE; override with `NEBIUS_EMBED_MODEL`). The three closest past decisions, with their similarity and rejection notes, go into the Nemotron prompt, so "less like that one" works by meaning rather than exact title. Embeddings are cached on the opportunity; if the call fails, scoring uses the title lists.
- **Re-checking saved opportunities:** before the daily digest, `src/lib/recheck.ts` re-reads up to 5 saved opportunities (each at most once a day) with Tavily Extract and the same Nemotron extraction and evidence check, then updates the deadline and closed status. The detail page shows what changed ("Re-checked: deadline now Nov 8").
- **Tavily Crawl of grant hubs:** if the profile lists Solana, Ethereum, Arbitrum or Sui, the hunt also crawls that ecosystem's grant hub one level deep (`tavilyCrawl`, with instructions to keep pages about a single program or funding round), alongside the searches.

## Extraction accuracy eval

`eval/pages/` holds 20 real pages saved from Tavily (Superteam Earn, Devpost, Gitcoin, ecosystem grant and creator contest pages), and `eval/labels.json` has hand labels for what each page actually states: whether it is a single opportunity, the reward, the deadline and whether it is closed. `npm run eval` runs the real extraction step over all 20 and reports accuracy per field, how many values are backed by a quote found on the page, and how many fields were left `unknown`. Results are written to `eval/results.json`.

```bash
NEBIUS_API_KEY=... npm run eval
```

Results with Nemotron on Token Factory: _pending, will be added once the key is configured._

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
npm test          # vitest: evidence check, unknown fields, risk rules, score caps, hunt URL filters, digest ranking, rate limits, structured output
npx tsc --noEmit && npm run lint
```

To run the whole pipeline offline (no Token Factory credits), `scripts/mock-token-factory.mjs` is a test-only stand-in for the chat completions endpoint. It also returns a made-up payout quote on some pages, so you can watch the evidence check turn it into `unknown`:

```bash
npm run mock:llm &                                   # http://localhost:4010/v1/
NEBIUS_API_KEY=mock NEBIUS_BASE_URL=http://localhost:4010/v1/ npm run dev
```

The deployed app always uses Nebius Token Factory. GitHub Actions (`.github/workflows/ci.yml`) runs type checks, lint, tests and a production build on every push and pull request.

## Deploy (Vercel)

1. Import the repo in Vercel (framework: Next.js).
2. Add a database: Vercel → Storage → Create Database → Neon. This injects `DATABASE_URL`. Tables are created automatically on first request.
3. Set env vars: `NEBIUS_API_KEY`, `TAVILY_API_KEY`, `CRON_SECRET` (any random string).
4. Deploy. `vercel.json` schedules `GET /api/cron` daily at 06:00 UTC: for each user active in the last 7 days with daily hunting on and a filled-in profile (up to `CRON_MAX_USERS`, default 25), it starts a separate hunt + digest run.

## API

| Route | Purpose |
| --- | --- |
| `GET/PUT /api/profile` | Read / save the profile |
| `POST /api/hunt` | Start a hunt in the background (Tavily → Nemotron extract → verify → score); returns `huntId` |
| `GET /api/hunt[?id=]` | Hunt status and live progress |
| `GET /api/opportunities` | Scored opportunities for the current user |
| `GET/PATCH /api/opportunities/:id` | Detail, drafts and agent trace / set status and feedback note |
| `POST /api/opportunities/:id/rescore` | Rescore with the latest profile and memory |
| `POST /api/opportunities/:id/analyze` | Deep fit analysis (Nemotron Ultra) |
| `POST/PATCH /api/opportunities/:id/draft` | Generate a draft (Nemotron Ultra) / edit or approve it |
| `GET /api/digest[?regenerate=1]` | Today's top 5 |
| `GET /api/cron` | Daily schedule: starts one hunt per user (needs `CRON_SECRET`) |
| `POST /api/cron/hunt` | One user's scheduled hunt + digest (needs `CRON_SECRET`) |
| `GET /api/status` | Which keys, models and database are configured |

## License

MIT, see [LICENSE](LICENSE).
