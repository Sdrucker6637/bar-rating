# How to run this project (Tour de Alcoholism — Next.js)

## Reproduce the uncommitted artifacts

This thread's workspace IS the main checkout (`C:\Users\spenc\Favorites\bar-rating`),
so nothing needs copying. For a fresh checkout elsewhere, reproduce the env file
by copying it from the main checkout (values may need adapting per worktree —
e.g. ports):

- Copy `.env.local` from the main checkout into the project root.
  It contains `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`, Firebase
  `NEXT_PUBLIC_*` vars, etc.) — never commit or print these values.

Then install dependencies:

- `npm install` (project uses npm; there is a `package-lock.json`).

The working tree currently has uncommitted source changes (Split the Bill
receipt normalization / manual tax-tip / no-photo note, leaderboard sort, and
the apple icon + Bar Battle refinements depending on branch state) — these are
plain source edits already present in this checkout; a fresh checkout needs the
same files restored from wherever the work is kept (git worktree, stash, etc.).

## Run the server

- Dev server (HMR): `npm run dev` → http://localhost:3000 by default.
  To force a port: `npm run dev -- -p <port>`.
- Production build: `npm run build` then `npm run start`.

Environment:

- `.env.local` at the project root is required for API routes
  (`/api/gemini`, `/api/places`, `/api/split-receipt` read `GEMINI_API_KEY` /
  `GEMINI_MODEL`; Firestore client config lives in `src/lib/firebase.ts`).
- Without a key, pages render but the AI/API routes fail.

Windows detached start (used by the preview harness — do not improvise a
different one):

```
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','-p','3000' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
```

stdout and stderr must go to DIFFERENT files. Confirm with
`Get-Process -Id <pid>` and `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`.
