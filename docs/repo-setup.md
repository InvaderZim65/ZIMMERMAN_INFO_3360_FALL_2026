# Repository Setup - Hockey Ops Player Directory

## Repository

- **GitHub:** https://github.com/InvaderZim65/ZIMMERMAN_INFO_3360_FALL_2026
- **Visibility:** Private
- **Collaborator:** `thortek` (instructor access)
- **Deploy target:** Vercel Hobby (auto-deploys from `main`)
- **Production URL:** https://zimmerman-info-3360-fall-2026.vercel.app

## Cloning and running locally

```bash
git clone https://github.com/InvaderZim65/ZIMMERMAN_INFO_3360_FALL_2026.git
cd ZIMMERMAN_INFO_3360_FALL_2026
npm install
npm run dev
```

The dev server starts at `http://localhost:3000`.

## Branch strategy

- `main` is the production branch. Vercel auto-deploys every push to `main`.
- Feature work goes on a separate branch and merges via pull request.

## Git status and remote

```
$ git status
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

```
$ git remote -v
origin	https://github.com/InvaderZim65/ZIMMERMAN_INFO_3360_FALL_2026.git (fetch)
origin	https://github.com/InvaderZim65/ZIMMERMAN_INFO_3360_FALL_2026.git (push)
```

The `.gitignore` was added before the first commit so that env files, `node_modules/`, and build output were never tracked in the repo history. The remote `origin` was set up with `git push -u origin main`, which links the local `main` branch to the remote so future `git push` and `git pull` commands default to the right place.

## .gitignore

The following are excluded from version control:

- `node_modules/` - installed dependencies (recreated by `npm install`)
- `dist/` - build output
- `.vinxi/` - TanStack Start dev cache
- `.output/` - Nitro production build output
- `.vercel/` - Vercel CLI local config
- `.env` / `.env.local` / `.env.production` - environment variables and secrets

## Environment variables

Server-only secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) go in `.env.local` for local dev and in Vercel's environment variable dashboard for production. The `.gitignore` blocks all `.env*` files from being tracked. No secrets are committed to the repo.

## Project structure

```
docs/               - requirements, checklists, decision logs
src/routes/          - file-based routes (TanStack Router)
src/components/      - shared React components
src/data/            - seed data modules
src/lib/             - param validation, search schemas
src/server/          - server-side data loaders
```
