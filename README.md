# SYM Web - Shiksha Yogi Management (Web ERP)

Full-stack web ERP for Shiksha Yogi, built with Next.js 16 (App Router) and Postgres
(works with Neon, Supabase, or any standard Postgres connection string). Four roles, each
with their own screens:

- **Management** - full ERP: students, batches, staff, fee collection, due fees, expenses,
  enquiries, notices, reports, search, settings (create teacher/guardian/student accounts).
- **Teacher** - sees only their assigned batches, views student lists, marks daily attendance.
- **Guardian** - views their linked child(ren)'s profile, fees and attendance, and can pay
  due fees (test-mode payment flow - see note below).
- **Student** - views their own profile, fees, attendance and notices.

## Getting started

1. Provision a Postgres database (Neon, Supabase, or any Postgres 14+ instance) and copy its
   connection string.
2. Create `.env.local` with:
   ```
   DATABASE_URL=postgresql://user:password@host:port/dbname
   JWT_SECRET=<a long random string>
   ```
3. Apply the schema and seed demo data:
   ```bash
   npm install
   node scripts/pg-migrate.js
   node scripts/seed-demo-pg.js
   npm run dev
   ```

Open http://localhost:3000 - you'll be redirected to `/login`.

Demo logins (from `scripts/seed-demo-pg.js`):

- **Management:** `admin` / `admin123`
- **Teacher:** `teacher1` / `teacher123`
- **Guardian:** `guardian1` / `guardian123`
- **Student:** `student1` / `student123`

Change the admin password immediately from Settings > My account once you're in.

## Creating teacher / guardian / student accounts

Log in as management, go to **Settings**, and use the "Teacher accounts", "Guardian
accounts" and "Student accounts" tabs to create logins and link them to batches or student
records. There is no public sign-up - this matches how the mobile app is used, with
management controlling access.

## Fee payments (guardian portal)

The "Pay now" button in the guardian portal currently runs in **test mode**: it records the
payment and settles the fee immediately so you can demo the full flow without a live payment
gateway. To go live, swap the handler in `app/api/guardian/pay/route.ts` for a real gateway
integration (e.g. Razorpay order creation + webhook verification) - the request/response
shape is already set up to support this.

## Notes on this build

- Uses `pg` directly against Postgres (no ORM). `lib/pg.ts` provides a small compatibility
  layer (`db.prepare(sql).all/get/run(...)`) so query code reads close to the original
  synchronous SQLite version, but every query is async now - always `await` it.
- Auth uses signed JWT cookies (`jose`, edge-compatible) so route protection works in
  Next.js middleware (`proxy.ts`).
- This mirrors the data model of the existing Expo/React Native app (`SYM/` folder) so the
  same institute data concepts apply, extended with roles, attendance, notices and
  guardian/student linking.
- `scripts/pg-schema.sql` is the source of truth for the schema; `scripts/pg-migrate.js`
  applies it (idempotent - safe to re-run). `scripts/seed-demo-pg.js` wipes and reseeds a
  full demo dataset.

## Deploying

Deploys to Vercel (or any Node host) as a normal Next.js app. Set `DATABASE_URL` and
`JWT_SECRET` as environment variables on the target - for Vercel specifically, use your
Postgres provider's connection pooler (e.g. Supabase's "Transaction pooler" on port 6543,
or Neon's pooled connection string) rather than a direct connection, since serverless
functions open many short-lived connections.
