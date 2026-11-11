<div align="center">

<img src="public/apple-touch-icon.png" alt="Kharji logo" width="80" height="80" style="border-radius: 16px" />

# Kharji

**Your finances, finally clear.**

A calm personal-finance app for people who think in more than one currency.
Track expenses, manage income, and always know where you stand.

[**Live App**](https://kharji.app) · [Try the Demo](https://kharji.app/login) · [Report a Bug](https://github.com/erfanansari/kharji/issues)

![Next.js](https://img.shields.io/badge/Next.js_16-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-087ea4?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38bdf8?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-Source--Available-blue)

<br />

![Kharji Overview](.github/screenshots/overview.png)

</div>

---

## Why Kharji?

Most finance apps assume you live in one currency. Kharji is built for people who don't — expats, freelancers with international clients, and anyone living between a local currency and the dollar. Every transaction is stored with the exchange rate of its day, so your history stays accurate even when rates move.

The entire codebase is public so you can read every line of code that touches your financial data before trusting it with your money.

## Features

- 💸 **Expense tracking** — log daily expenses with custom categories, tags, and full-text search
- 💰 **Income management** — track monthly income by type (salary, freelance, investment, and more)
- 🏦 **Asset portfolio** — track wealth across cash, crypto, commodities, vehicles, property, bank accounts, and investments, with full valuation history and a net-worth chart
- 🌍 **Multi-currency** — ten currencies (IRT, USD, EUR, GBP, AED, TRY, CAD, AUD, SEK, CHF) with live exchange rates and per-date historical conversion
- 🗣️ **Bilingual (English / فارسی)** — full RTL layout, Persian digits and typography, and an independent Gregorian/Jalali calendar preference
- 📊 **Reports** — spending analytics with daily, weekly, and monthly granularity, category breakdowns, and trends
- 🏷️ **Tags & categories** — create tags inline as you type, manage everything centrally in Settings, with locale-aware defaults for new accounts
- 📤 **Excel export & import** — your data is never locked in
- 📧 **Email reports** — optional monthly and yearly summaries delivered to your inbox, sent in your chosen language
- 🌙 **Dark mode** — easy on the eyes, day or night
- ⌨️ **Command palette** — jump anywhere with a keystroke
- 📱 **Installable PWA** — add it to your home screen like a native app
- 🔐 **Privacy-first auth** — self-hosted via Better Auth (no hosted third-party auth SaaS), HTTP-only session cookies, PBKDF2-hashed passwords, optional Google sign-in, and an active-device list with instant revocation
- 💾 **Daily backups** — automated encrypted database dumps with 30-day retention

## Screenshots

|                       Expenses                        |                   Reports                   |
| :---------------------------------------------------: | :-----------------------------------------: |
|     ![Expenses](.github/screenshots/expenses.png)     | ![Reports](.github/screenshots/reports.png) |
|                      **Assets**                       |                 **Income**                  |
|       ![Assets](.github/screenshots/assets.png)       |  ![Income](.github/screenshots/income.png)  |
|                    **Light Mode**                     |              **Landing Page**               |
| ![Light Mode](.github/screenshots/overview-light.png) | ![Landing](.github/screenshots/landing.png) |

### فارسی ‌(Farsi, first-class)

Kharji isn't translated — it's written in Farsi. Full RTL layout, Persian digits, the Jalali calendar, and copy in everyday conversational Persian.

|                     داشبورد                     |                     هزینه‌ها                      |
| :---------------------------------------------: | :-----------------------------------------------: |
| ![داشبورد](.github/screenshots/overview-fa.png) | ![هزینه‌ها](.github/screenshots/expenses-fa.png)  |
|                  **گزارش‌ها**                   |                  **صفحهٔ اصلی**                   |
| ![گزارش‌ها](.github/screenshots/reports-fa.png) | ![صفحهٔ اصلی](.github/screenshots/landing-fa.png) |

## Tech Stack

| Layer                | Choice                                                                       |
| -------------------- | ---------------------------------------------------------------------------- |
| Framework            | [Next.js 16](https://nextjs.org) (App Router, React 19)                      |
| Language             | TypeScript (strict)                                                          |
| Database             | [Turso](https://turso.tech) (libSQL / SQLite)                                |
| Styling              | Tailwind CSS v4                                                              |
| Charts               | Recharts                                                                     |
| Tables & data        | TanStack Table v8 · TanStack Query v5                                        |
| Auth                 | [Better Auth](https://www.better-auth.com) (self-hosted, session cookies)    |
| Internationalization | [next-intl](https://next-intl.dev) — English + Persian, RTL, Jalali calendar |
| Email                | Resend + React Email                                                         |
| Validation           | Zod                                                                          |
| PWA                  | Serwist                                                                      |

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- A free [Turso](https://turso.tech) database — or nothing at all: a local SQLite file works too (see below)

### Setup

```bash
# 1. Clone and install
git clone https://github.com/erfanansari/kharji.git
cd kharji
pnpm install

# 2. Configure environment
cp .env.local.example .env.local   # then fill in your values

# 3. Create the database schema
pnpm db:setup                # local SQLite file (TURSO_DATABASE_URL=file:./local.db)
pnpm migrate                 # …or bring an existing Turso database up to date

# 4. (Optional) seed sample data
pnpm db:seed-demo            # demo account with five years of activity

# 5. Start the dev server
pnpm dev                     # http://localhost:3000
```

### Environment Variables

Five variables are required — everything else degrades gracefully when unset. See `.env.local.example` for the full annotated list.

| Variable                                                                         | Required | Description                                                                                                          |
| -------------------------------------------------------------------------------- | :------: | -------------------------------------------------------------------------------------------------------------------- |
| `TURSO_DATABASE_URL`                                                             |    ✅    | Turso database connection URL                                                                                        |
| `TURSO_AUTH_TOKEN`                                                               |    ✅    | Turso authentication token                                                                                           |
| `BETTER_AUTH_SECRET`                                                             |    ✅    | Long random string used to sign session cookies (`openssl rand -base64 32`)                                          |
| `BETTER_AUTH_URL`                                                                |    ✅    | Base URL Better Auth runs on (e.g. `http://localhost:3000`)                                                          |
| `APP_URL`                                                                        |    ✅    | Public URL of the app, used for absolute links in emails                                                             |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                                      |    —     | Google sign-in ([Cloud Console](https://console.cloud.google.com/apis/credentials)); Google login is hidden if unset |
| `NAVASAN_API_KEY`                                                                |    —     | Live exchange rates ([Navasan](https://navasan.tech)); falls back to the free tier                                   |
| `RESEND_API_KEY`                                                                 |    —     | Transactional email ([Resend](https://resend.com)); emails are skipped if unset                                      |
| `CRON_SECRET`                                                                    |    —     | Authenticates scheduled jobs (reports, backups, rate refresh)                                                        |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` |    —     | Error monitoring ([Sentry](https://sentry.io)); provided automatically on Vercel                                     |
| `B2_KEY_ID` / `B2_APPLICATION_KEY` / `B2_BUCKET_NAME` / `B2_ENDPOINT`            |    —     | Daily database backups to Backblaze B2                                                                               |

## Development

```bash
pnpm dev          # start dev server
pnpm build        # production build
pnpm check        # lint + format check + typecheck
pnpm test         # run unit tests (Jest + React Testing Library)
pnpm email:dev    # preview email templates at http://localhost:3001
```

### Project Structure

```
src/
├── @schemas/      Zod validation schemas + tests
├── @types/        TypeScript type definitions
├── app/           Next.js App Router pages + API routes
├── components/    Shared UI primitives (Button, Modal, Toast, …)
├── constants/     Centralized category/type/currency definitions
├── core/          Database client, migrations, auth, exchange rates
├── emails/        React Email templates
├── features/      Feature-scoped components (expenses, income, assets)
├── hooks/         Shared React hooks
└── utils/         Pure utility functions + tests
```

## Releases

Kharji follows [Semantic Versioning](https://semver.org/). See [CHANGELOG.md](CHANGELOG.md) for the full history, [kharji.app/changelog](https://kharji.app/changelog) for the user-facing version, and [RELEASING.md](RELEASING.md) for the release process.

## Contributing

Bug reports and pull requests are welcome. For larger changes, please open an issue first to discuss what you'd like to change, and make sure `pnpm check && pnpm test` passes before submitting.

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, …), enforced by commitlint on commit. This is what drives version bumps and the changelog — see [RELEASING.md](RELEASING.md).

## License

Kharji is published under the **Kharji Source-Available License (View-Only) v1.0** — see [LICENSE](./LICENSE) for the full text.

The source is public for transparency and auditability: you should be able to read every line of code that touches your financial data before trusting it.

- **You can:** read, audit, quote excerpts, and submit pull requests
- **You cannot:** run/host/deploy, fork, reuse in another project, or redistribute

To use Kharji outside these terms, contact **dev.erfanansari@gmail.com**.

---

<div align="center">
Made with ❤️ by <a href="https://github.com/erfanansari">Erfan Ansari</a>
</div>
