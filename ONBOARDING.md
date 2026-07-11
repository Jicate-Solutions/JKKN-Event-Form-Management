# Welcome to JKKN-Event-Form-Management

You're set up to succeed here — the guardrails in this repo catch most mistakes automatically, so don't be afraid to ship.

## Day 1 — Setup (should take under an hour)

1. Clone this repo: `git clone https://github.com/Jicate-Solutions/JKKN-Event-Form-Management`
2. Install dependencies: `npm install` (or `pnpm install` if there's a `pnpm-lock.yaml`)
3. Copy `.env.example` to `.env.local` and ask your reviewer for the values
4. Run it: `npm run dev` → open http://localhost:3000
5. Read `CLAUDE.md` in the repo root — those are the project rules. If you use Claude Code, it reads them automatically.

Stuck for more than 30 minutes on setup? Ask. Setup problems are never your fault.

## Your First Task — the 48-hour thin slice

Your first PR is due within **48 hours** and it is deliberately small: one thin end-to-end slice of your assigned task — one table, one API route, one page, wired into the real app. Not the whole feature. The point is to prove your setup works and your code fits the codebase while mistakes are still cheap.

## How Work Flows Here

- **Tasks are 2-day units.** Every task should produce a PR within 2 days. If you're at 48 hours with no PR, post what's blocking you — that's normal and expected, silence is the only failure.
- **Everything goes through a pull request.** You cannot push to the main branch directly (the repo blocks it — it's not about trust, everyone works this way here).
- **Every PR needs proof.** A screenshot or short video of the thing working (or command output for non-UI work). The PR template asks for it.
- **Every PR gets a live preview.** A bot comments a preview URL on your PR a couple of minutes after you push — your change running on a real server. Paste that link into the PR template's "Preview URL" line; reviewers judge from it.
- **CI must be green + one approval.** The machines check your code first, then a reviewer approves. Address review comments in the same PR.

## Before Building Anything New

Read the "Pattern Survey" section in `CLAUDE.md` and do it. Five minutes of searching for existing code saves you days of building something that already exists and can't be merged.

## Getting Help

- Blocked on the task → comment on the issue/PR, tag your reviewer
- Blocked on setup/access → message @Ommsharravana
- Found a bug outside your task → open an issue, don't fix it in your PR
