# Team

Find your work with: `grep -rn "TODO(dev1)" src db scripts` (or dev2, dev3).

| Dev  | Area                                   | Owns                                                                                                                                                                                                                                                                                                                               |
| ---- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dev1 | Data, API, Tiger Data                  | `db/`, `scripts/`, `src/lib/db.ts`, `src/lib/mock-data.ts`, `src/app/api/*` (except explain, speak, learn, insights)                                                                                                                                                                                                               |
| dev2 | Register + Stock screens               | `src/app/register`, `src/app/stock`, `src/components/register`, `src/components/stock`, `src/components/nav`, PWA                                                                                                                                                                                                                  |
| dev3 | Money + teaching screens, integrations | `src/app/money`, `src/components/money`, `src/app/learn`, `src/components/learn`, `src/lib/learn*.ts`, `api/learn`, `src/components/voice`, `src/lib/integrations`, `src/lib/speech.ts`, `src/lib/explain.ts`, `api/explain`, `api/speak`, `api/insights`, `src/lib/metrics.ts`, `src/lib/insights*.ts`, `src/components/insights` |

## Git rule

- Never commit to `main` directly. Branch as `dev1/<thing>`, `dev2/<thing>`, `dev3/<thing>`.
- Pull `main` often; open small PRs; merge when `npm run lint && npm run typecheck` pass.
- `src/lib/types.ts`, `db/schema.sql` and `src/styles/tokens.css` are shared: change them in their own small PR and tell the team.
