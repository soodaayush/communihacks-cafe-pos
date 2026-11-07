# KW Habilitation Café POS

Picture-first café register (PWA) that teaches how money works. Built for CommuniHacks. All data is fake.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Tiger Data (Postgres + TimescaleDB) · Cloudinary · Gemini. Deploy target: Vultr.

## Run

```bash
npm install && npm run dev     # http://localhost:3000
```

No env vars are needed to start: every API route returns mock data. Copy `.env.example` to `.env.local` to connect Tiger Data, Cloudinary and Gemini. Without `GEMINI_API_KEY`, insights use local wording.

### Database (Tiger Data)

1. Get the `DATABASE_URL` from the team lead (privately, never in git) and put it in `.env.local`.
2. `npm run db:schema` creates the tables (safe to re-run). `npm run db:seed` fills 30 days of fake history, and **wipes** these tables first.
3. With `DATABASE_URL` set, every route in `src/app/api` reads and writes the real database. Without it, they return mock data.

Tiger Data features in use: hypertables with columnstore compression (`sales`, `sale_items`, `stock_movements`), real-time continuous aggregates (`sales_daily`, `sales_hourly`, `item_daily`) with refresh policies, and `time_bucket_gapfill` for charts with no holes. Also: `/api/busy-hours` (sales by hour of day), a weekday-aware `/api/restock-suggestions` (with `daysLeft`).

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
