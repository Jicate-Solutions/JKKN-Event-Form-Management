# How To Use This Handoff

> **For:** Omm (project owner) | **Topic:** MCP Server for AI Forms

## What This Is

A complete developer handoff package for the MCP server we just built. Give these files to Boobalan (or any developer) so they can deploy the MCP endpoint to production.

## What The Developer Needs To Do

### Step 1: Ensure Vercel Env Vars Are Set

The build fails because these env vars are missing from the Vercel project settings. The developer who normally deploys (Boobalan) has them — he just needs to verify they're at the project level, not just his personal scope.

### Step 2: Redeploy

The code is already on `main`. Just trigger a new Vercel deployment.

### Step 3: Test

```bash
# Should return a list of 21 MCP tools
curl -X POST https://ai-forms.jicate.solutions/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## How To Share With Developer

Copy-paste this message:

---

**Subject: MCP Server Ready for Deployment**

Hi, I've added an MCP (Model Context Protocol) server to the AI Forms app. It lets JKKN staff create and manage forms through Claude conversation instead of the web UI.

**What was added:**
- 21 MCP tools (form CRUD, responses, analytics, AI insights, events)
- OAuth route for Claude.ai connector
- Rate limiting (60 req/min per IP)
- Full documentation (FOROMM.md)

**What you need to do:**
1. Verify Vercel env vars are set at the project level (RESEND_API_KEY, SUPABASE keys, ANTHROPIC_API_KEY)
2. Trigger a redeployment
3. Test: `curl -X POST https://ai-forms.jicate.solutions/api/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`

**Files to review:**
- `specs/mcp-server-spec.md` — Full spec with architecture decisions
- `specs/mcp-server/00-HANDOFF-INDEX.md` — Quick start
- `specs/mcp-server/01-ARCHITECTURE.md` — System design

**No database changes. All service method changes are backward-compatible (optional params added).**

Commits: `fd5ec25` and `bad2f06` on `main`.

---

## Files In This Package

| File | What It Is |
|------|-----------|
| `specs/mcp-server-spec.md` | Master spec — decisions, architecture, known issues |
| `specs/mcp-server/HOW-TO-USE.md` | This file |
| `specs/mcp-server/00-HANDOFF-INDEX.md` | Quick start for the developer |
| `specs/mcp-server/01-ARCHITECTURE.md` | System design, file structure, data flow |
| `FOROMM.md` | Plain-language documentation (already at project root) |
| `docs/SPEC.md` | Original SDD spec with full implementation plan |
