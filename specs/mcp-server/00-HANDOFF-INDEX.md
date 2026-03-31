# MCP Server Handoff — Quick Start

> **For:** Developer (Boobalan or AI agent) | **Priority:** Deploy to production

## TL;DR

An MCP server was added to the AI Forms app. 21 tools let JKKN staff manage forms via Claude conversation. Code is on `main`, 2 commits. **You just need to deploy.**

## Commits

| Hash | Description |
|------|-------------|
| `fd5ec25` | Initial MCP server — 21 tools, auth, helpers, spec |
| `bad2f06` | Bug fixes (8), OAuth route, rate limiting, FOROMM.md |

## Files Changed (11 total)

### New Files (6)

```
app/api/mcp/route.ts            ← MCP endpoint (119 lines)
app/api/mcp/oauth/route.ts      ← OAuth for Claude.ai (682 lines)
lib/mcp/auth.ts                 ← Token verification + RBAC (81 lines)
lib/mcp/helpers.ts              ← Response formatters (50 lines)
lib/mcp/tools.ts                ← 21 tool registrations (1035 lines)
FOROMM.md                       ← Plain-language documentation (328 lines)
```

### Modified Files (3)

```
lib/services/personal-form-service.ts  ← Added supabaseClient? to 4 methods
package.json                           ← +2 deps (mcp-handler, @modelcontextprotocol/sdk)
.mcp.json                             ← +1 server entry (jkkn-ai-forms)
```

### Documentation (2)

```
docs/SPEC.md                           ← Full SDD spec (1738 lines)
specs/mcp-server-spec.md               ← This handoff's master spec
```

## What To Do

### 1. Verify Env Vars (2 min)

Ensure these exist in Vercel project settings (not just personal scope):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_APP_URL=https://ai-forms.jicate.solutions
```

### 2. Deploy (automatic)

Push to `main` triggers Vercel auto-deploy. Or manually: `vercel --prod`

### 3. Test (1 min)

```bash
# List tools (no auth needed)
curl -X POST https://ai-forms.jicate.solutions/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Expected: JSON response with 21 tools listed
```

## Key Architecture Decisions

1. **Thin wrappers** — MCP tools call existing services, no business logic duplication
2. **Supabase JWT auth** — Reuses existing Google OAuth; no new auth system
3. **Rate limiting** — 60 req/min per IP, in-memory (best-effort on serverless)
4. **OAuth route** — For Claude.ai custom connector; serves login page + handles token exchange
5. **Backward compatible** — All service method changes are optional params; existing callers unaffected

## No Database Changes

Zero new tables, columns, or migrations. The MCP server is purely an API interface layer.

## Known Issues (pre-existing, not caused by MCP)

1. Build fails without env vars (Resend API key, Supabase URL)
2. TS error in `personal-form-service.ts:737` (RPC function name type mismatch)
3. Supabase access token exposed in `.mcp.json` (should be rotated)

## File Guide

| Need To... | Read This |
|-----------|-----------|
| Understand the system | `specs/mcp-server-spec.md` |
| See all 21 tools | `lib/mcp/tools.ts` or `docs/SPEC.md` Section 4 |
| Understand auth flow | `lib/mcp/auth.ts` + `app/api/mcp/oauth/route.ts` |
| Explain to non-coder | `FOROMM.md` |
