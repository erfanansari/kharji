# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an expense tracker application built with Next.js 16, using the App Router architecture. The stack includes:
- **Framework**: Next.js 16.0.10 (React 19.2.3)
- **Language**: TypeScript with strict mode enabled
- **Database**: Turso (libSQL) via `@libsql/client`
- **Styling**: Tailwind CSS v4 (using new PostCSS plugin architecture)
- **Package Manager**: pnpm 10.24.0
- **Fonts**: Geist Sans and Geist Mono (via next/font)

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server (http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## Project Structure

```
expense-tracker/
├── app/              # Next.js App Router directory
│   ├── layout.tsx    # Root layout with font configuration
│   ├── page.tsx      # Home page
│   └── globals.css   # Global Tailwind styles
├── public/           # Static assets
├── .env.local        # Environment variables (contains Turso credentials)
└── tsconfig.json     # TypeScript configuration
```

## Configuration Details

### TypeScript Configuration
- Target: ES2017
- Strict mode: enabled
- Module resolution: bundler (Next.js optimized)
- Path alias: `@/*` maps to project root
- JSX: react-jsx

### Database (Turso/libSQL)
Database credentials are stored in `.env.local`:
- `TURSO_DATABASE_URL`: Connection URL to Turso database
- `TURSO_AUTH_TOKEN`: Authentication token

### Tailwind CSS v4
This project uses Tailwind CSS v4 with the new PostCSS plugin (`@tailwindcss/postcss`). Configuration is in `postcss.config.mjs`.

### ESLint
Uses Next.js ESLint config with TypeScript support:
- `eslint-config-next/core-web-vitals`
- `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

## Architecture Notes

### App Router (Next.js 16)
This project uses the App Router (not Pages Router). All routes are defined in the `app/` directory using file-system based routing.

### Font Loading
Custom fonts (Geist Sans and Geist Mono) are loaded via `next/font/google` in `app/layout.tsx` and applied using CSS variables (`--font-geist-sans`, `--font-geist-mono`).

### Styling Approach
Tailwind CSS utility classes are used directly in components. Dark mode support is implemented via Tailwind's `dark:` variant.

## Important Conventions

- Always use `pnpm` for package management (enforced via `packageManager` field)
- Follow Next.js 16 App Router conventions (Server Components by default)
- Environment variables for Turso database must be present in `.env.local`
- TypeScript strict mode is enabled - all code must pass type checking
