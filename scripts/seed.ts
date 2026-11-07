// Run: DATABASE_URL=... npm run db:seed
// TODO(dev1): insert fake menu_items, then ~30 days of sales + sale_items, purchases and expenses.
//             Reuse values from src/lib/mock-data.ts. All amounts in cents.

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL not set. Nothing to seed.");
    return;
  }
  console.log("TODO(dev1): seed script not written yet.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
