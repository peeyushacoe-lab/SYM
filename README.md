# SYM Web - Shiksha Yogi Management (Web ERP)

Full-stack web ERP for Shiksha Yogi, built with Next.js 14 (App Router) and a local SQLite
database (via `better-sqlite3`). Four roles, each with their own screens:

- **Management** - full ERP: students, batches, staff, fee collection, due fees, expenses,
  enquiries, notices, reports, search, settings (create teacher/guardian/student accounts).
- **Teacher** - sees only their assigned batches, views student lists, marks daily attendance.
- **Guardian** - views their linked child(ren)'s profile, fees and attendance, and can pay
  due fees (test-mode payment flow - see note below).
- **Student** - views their own profile, fees, attendance and notices.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 - you'll be redirected to `/login`.

A database file `sym.db` is created automatically on first run, along with a default
management login:

- **Username:** `admin`
- **Password:** `admin123`

Change this password immediately from Settings > My account once you're in.

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

- Uses `better-sqlite3` directly (no Prisma) so there's no external binary download step
  beyond the normal `npm install`.
- Auth uses signed JWT cookies (`jose`, edge-compatible) so route protection works in
  Next.js middleware.
- This mirrors the data model of the existing Expo/React Native app (`SYM/` folder) so the
  same institute data concepts apply, extended with roles, attendance, notices and
  guardian/student linking.

## Deploying

This is a normal Next.js app - it can be deployed to any Node host (Vercel with a persistent
disk, Railway, Render, a VPS, etc.). Since it uses a local SQLite file, make sure the
deployment target has persistent storage for `sym.db`, or swap `lib/db.ts` for a hosted
database if you need multi-instance scaling.
