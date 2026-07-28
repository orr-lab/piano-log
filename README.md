# Piano Log

A private, single-user practice journal for piano recordings. Upload a video (or paste a
YouTube link) after each take, tag it, rate its difficulty, jot practice notes, and watch
your progress on a piece over time.

Built with Next.js (App Router) + TypeScript, Tailwind + shadcn/ui, Prisma + Postgres,
Vercel Blob for uploaded video, and Recharts for the stats page.

> **A note on the stack vs. the original spec:** this was scaffolded with the latest stable
> Next.js (16) rather than pinned to 14, since 14 no longer receives updates — `create-next-app@latest`
> installs whatever is current. SQLite was swapped for Postgres (Neon, via Vercel's free
> marketplace tier) because Vercel's serverless functions have a read-only, ephemeral
> filesystem — a SQLite file would not reliably survive between deployments or even
> separate function invocations in production. Prisma is pinned to the 6.x line rather
> than the newly-released 7, which drops the classic `datasource url` schema config in
> favor of driver adapters — a much bigger workflow change than this app needs.

## How the data model works

There's no separate "Piece" table. A **Recording** is one take of one piece (title +
composer + date + video + tags + difficulty + notes + optional tempo). Pieces are
computed on the fly by grouping recordings on `title` + `composer` (case-insensitive) —
see [src/lib/stats.ts](src/lib/stats.ts) and the `/piece` route.

## Prerequisites

- Node.js 20+
- A Vercel account (for Blob storage and Postgres) — the free/Hobby tier covers this app
- The [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`), logged in (`vercel login`)

## 1. Environment variables

Copy `.env.local` (already created if you used `vercel link` + `vercel blob create-store`,
see below) or create one with:

| Variable | Where it comes from |
|---|---|
| `SITE_PASSWORD` | Pick your own password. This is the **owner** password — full read/write access. Set it yourself, don't use the placeholder that may already be in `.env.local` from development. |
| `VISITOR_PASSWORD` | Optional. A second, different password that grants **read-only** access — visitors can browse the dashboard, library, piece pages, and stats, but every create/edit/delete/favorite action is blocked (both hidden in the UI and rejected by the server). Leave unset if you don't want a visitor mode. |
| `DATABASE_URL` | From your Postgres provider (Neon via Vercel Marketplace, or any Postgres). Pulled automatically by `vercel env pull` once connected. |
| `BLOB_READ_WRITE_TOKEN` | Created automatically when you run `vercel blob create-store` (see below), or from the Blob store's settings in the Vercel dashboard. |
| `GEMINI_API_KEY` | Optional. Powers the "AI feedback" button on a recording — Gemini watches the take and returns a 1-5 rating plus a few sentences of coaching feedback. Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Leave unset to hide/disable the feature (it fails gracefully with a clear error if a request is made without it). |
| `YOUTUBE_COOKIES` | Optional. Lets the AI-feedback feature fetch a YouTube recording's audio itself instead of asking Gemini to (see [AI feedback](#ai-feedback-gemini) below for why, and how to get this value — it's a real login session, handle it like a credential). Leave unset to skip. |

## 2. Set up Vercel Postgres (Neon) and Blob storage

```bash
vercel link
```

Blob storage (first-party Vercel product, no extra sign-up):

```bash
vercel blob create-store piano-log-media --access public --yes
```

Postgres is provided through Neon on Vercel's integration marketplace. This step requires
accepting Neon's terms of service in a browser first (a one-time step tied to your Vercel
account — the CLI can't do this on your behalf):

```bash
vercel integration add neon
```

The command will print a `verification_uri` — open it, accept the terms, then re-run the
same command to finish provisioning. Once it succeeds, pull the resulting env vars down:

```bash
vercel env pull .env.local
```

## 3. Install dependencies and set up the database schema

```bash
npm install
npx prisma migrate dev --name init
```

`prisma migrate dev` creates the `Recording` table in your Postgres database and generates
the Prisma Client. Re-run `npx prisma migrate deploy` (not `dev`) in CI/production if you
ever change `prisma/schema.prisma`.

## 4. Run it locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and log in with your `SITE_PASSWORD`.

## 5. Deploy to Vercel

```bash
vercel deploy --prod
```

Make sure `SITE_PASSWORD` (and `VISITOR_PASSWORD`, if you want visitor access) are set as
production environment variables in the Vercel dashboard (Project Settings → Environment
Variables) — `vercel env pull` only pulls variables *from* Vercel, it won't push your
local values there for you.

## Staying on the free tier

- **Uploads are capped at 100MB** in the UI (`MAX_UPLOAD_BYTES` in
  [src/lib/validation.ts](src/lib/validation.ts)), with a note recommending YouTube links
  for longer recital recordings — this keeps you well under Vercel Blob's free storage
  allowance even with dozens of takes logged.
  Uploads go straight from the browser to Blob storage (via `@vercel/blob/client`'s
  `handleUpload`/token flow), bypassing Vercel's serverless function body-size limit
  entirely, so the 100MB cap is a storage-budget choice, not a technical ceiling.
- **Neon's free tier** has limits on storage and active compute time; a personal practice
  log with metadata-only rows (no video bytes in the database) stays tiny for a very long
  time.
- Check the current Vercel Blob and Neon pricing pages before you scale this up — free-tier
  limits change over time and aren't hard-coded into this app.

## AI feedback (Gemini)

The "Get AI feedback" button on a recording sends the video to Gemini
(`gemini-3.6-flash`) and asks for a 1-5 rating plus a few sentences of coaching feedback
on tempo, dynamics, and consistency — see [src/lib/gemini.ts](src/lib/gemini.ts). Two
things worth knowing:

- **Uploaded video files** are fetched from Blob storage and pushed to Gemini's Files API
  directly (no external indexing dependency), so this path is reliable as soon as a
  recording exists.
- **YouTube links** are handled by downloading the audio ourselves with a bundled
  `yt-dlp` binary ([src/lib/ytdlp.ts](src/lib/ytdlp.ts)) and uploading that to Gemini,
  rather than asking Gemini to fetch the video (which only works once Google's own
  systems have indexed it — a real problem for a video you just uploaded). If yt-dlp
  can't get the audio for any reason, it falls back to handing Gemini the URL directly.

  **YouTube blocks requests from cloud/datacenter IPs** (including Vercel's) with a
  "confirm you're not a bot" challenge, so yt-dlp will fail on Vercel *unless* you supply
  cookies from a real, logged-in YouTube session:

  1. Log into YouTube in a normal browser tab.
  2. Export cookies for `youtube.com` in Netscape cookie-file format — a browser extension
     like "Get cookies.txt LOCALLY" does this in one click.
  3. Set the exported file's contents as the `YOUTUBE_COOKIES` environment variable
     (as one value, newlines and all).

  **Treat this like any other login credential** — it's a live session for a real Google
  account, not a purpose-made API key. Consider using a secondary/throwaway Google account
  for this rather than your main one, and expect to periodically re-export the cookies as
  the session expires. Leave `YOUTUBE_COOKIES` unset to skip this entirely — the feature
  still works for uploaded files and for already-indexed YouTube videos either way.

## Project structure

- `prisma/schema.prisma` — the `Recording` model
- `src/middleware.ts` — password-gate session check on every route (Next.js has
  deprecated the `middleware.ts` convention in favor of `proxy.ts`; this still works, just
  expect a build-time deprecation warning)
- `src/app/api/*` — recordings CRUD, Blob upload token endpoint, login/logout, facets
  (distinct composers/tags for filters)
- `src/app/*` — dashboard, `/new`, `/library`, `/piece` (progression view), `/recordings/[id]`
  (+ `/edit`), `/stats`
- `src/lib/stats.ts` — streak, practice-time, and grouping calculations shared by the
  dashboard and stats page
