# KW Habilitation Café POS

Picture-first café register (PWA) that teaches how money works. Built for CommuniHacks. All data is fake.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Tiger Data (Postgres + TimescaleDB) · Cloudinary · Gemini. Deploy target: Vultr.

## Run

```bash
npm install && npm run dev     # http://localhost:3000
```

No env vars are needed to start: every API route returns mock data. Copy `.env.example` to `.env.local` to connect Tiger Data, Cloudinary and Gemini. Without `GEMINI_API_KEY`, insights use local wording.

### Read aloud (ElevenLabs)

Every speaker button reads its text aloud through `POST /api/speak`, which calls ElevenLabs text-to-speech. The API key stays on the server (`src/app/api/speak/route.ts`); the browser never sees it.

1. Create a key at https://elevenlabs.io/app/api/api-keys and put it in `.env.local` as `ELEVENLABS_API_KEY=...` (never commit it).
2. Optional: `ELEVENLABS_VOICE_ID` (copy a voice's ID from the Voice Library) and `ELEVENLABS_MODEL` (default `eleven_flash_v2_5`).
3. Restart `npm run dev`. Without a key, or if ElevenLabs is down or out of credits, the speaker falls back to the browser's built-in voice, so the app always talks.

To save credits, a sentence is generated once and reused (server cache, plus the page remembers what it already fetched), a sentence can be at most 1000 characters, and at most 60 new sentences are sent per minute (`ELEVENLABS_MAX_PER_MINUTE`). Tap a speaker again to stop it.

### Database (Tiger Data)

1. Get the `DATABASE_URL` from the team lead (privately, never in git) and put it in `.env.local`.
2. `npm run db:schema` creates the tables (safe to re-run). `npm run db:seed` fills 30 days of fake history, and **wipes** these tables first.
3. With `DATABASE_URL` set, every route in `src/app/api` reads and writes the real database. Without it, they return mock data.

Tiger Data features in use: hypertables with columnstore compression (`sales`, `sale_items`, `stock_movements`), real-time continuous aggregates (`sales_daily`, `sales_hourly`, `item_daily`) with refresh policies, and `time_bucket_gapfill` for charts with no holes. Also: `/api/busy-hours` (sales by hour of day), a weekday-aware `/api/restock-suggestions` (with `daysLeft`).

Drinks are made to order, so they have no shelf count. The `recipes` table says how much of each back-room ingredient a Small / Medium / Large uses (coffee beans in g, tea leaves in g, milk and lemonade in ml, oranges for fresh juice, sugar in pouches for coffee and hot chocolate, plus a cup and a lid). Selling a drink subtracts its recipe in the same transaction as the sale and logs it in `stock_movements` as "use"; its cost is what those ingredients cost. The register's "can still make" number for a drink comes from the ingredients. Back-room items are bought in packs (`pack_name`, `pack_size`, price per pack) and measured ones show "% full" against `full_qty`.

Stock counts: `POST /api/inventory/count` (shelf items) and `POST /api/supplies/count` (back room; the change is logged in `stock_movements` as an adjustment). The Stock tab's "✏️ Count" buttons use them.

Back-room stock (ingredients, packaging, supplies) is at `/api/supplies`; stock changes are logged via `POST /api/supplies/movements`. `/api/inventory` and `/api/menu` are the sellable items.

## Where things go

| Path                                   | What                                                    |
| -------------------------------------- | ------------------------------------------------------- |
| `src/app/<screen>/page.tsx`            | Screens: `register`, `stock`, `money`                   |
| `src/app/api/**/route.ts`              | One file per API route                                  |
| `src/components/<area>/`               | UI pieces: `register`, `stock`, `money`, `voice`, `nav` |
| `src/lib/types.ts`                     | **Shared contract.** Money is always whole cents        |
| `src/lib/db.ts`                        | Tiger Data client (`query()`) — server only             |
| `src/lib/mock-data.ts`                 | Fake data the API returns until the DB is wired         |
| `src/lib/integrations/cloudinary.ts`   | Image URLs + signed uploads                             |
| `src/lib/speech.ts`                    | Read aloud (browser Web Speech API)                     |
| `src/lib/explain.ts`                   | Simple-words explanations (local rules)                 |
| `src/lib/metrics.ts`                   | Insight numbers, computed in code (never by the AI)     |
| `src/lib/insights.ts`                  | Picks top 3 insights; Gemini wording + local fallback   |
| `src/lib/integrations/gemini.ts`       | Gemini call (structured JSON)                           |
| `src/styles/tokens.css`                | Colours, touch size, font sizes (Tailwind `@theme`)     |
| `src/app/manifest.ts`, `public/icons/` | PWA manifest + icons                                    |
| `db/schema.sql`                        | Database schema (`npm run db:schema`, needs `psql`)     |
| `scripts/seed.ts`                      | Fake data seed (`npm run db:seed`)                      |

Tailwind 4 is configured in CSS, so there is no `tailwind.config.js`: tokens in `src/styles/tokens.css` become utilities such as `bg-sage`, `min-h-touch`, `text-number` and `rounded-tile`.

## Scripts

`dev` · `build` · `start` · `lint` · `typecheck` · `format` · `db:schema` · `db:seed`

See [TEAM.md](TEAM.md) for who owns what.
