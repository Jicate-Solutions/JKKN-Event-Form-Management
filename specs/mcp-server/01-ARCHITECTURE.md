# MCP Server Architecture

## System Design

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  Claude.ai /    │     │   JKKN AI Forms      │     │              │
│  Claude Code    │────▶│   /api/mcp           │────▶│  Supabase    │
│  (MCP Client)   │     │                      │     │  (PostgreSQL)│
│                 │◀────│  Rate Limit → Auth   │◀────│              │
│                 │     │  → Tool → Service    │     │  RLS-scoped  │
└─────────────────┘     └─────────────────────┘     └──────────────┘
        │                        │
        │ OAuth flow             │ AI Insights
        ▼                        ▼
┌─────────────────┐     ┌──────────────┐
│  Google OAuth   │     │  Claude API  │
│  (Supabase Auth)│     │  (Haiku)     │
└─────────────────┘     └──────────────┘
```

## Request Flow

```
1. Client sends POST /api/mcp with MCP protocol message
2. Rate limiter checks IP (60 req/min)
3. withMcpAuth extracts Bearer token → verifyToken()
4. verifyToken creates Supabase client with token → getUser() → get role from profiles
5. Returns AuthInfo { clientId: userId, scopes: [role] }
6. MCP SDK routes to correct tool handler
7. Tool handler calls extractAuth(extra) → gets userId, role, token
8. Tool creates Supabase client with user's token (respects RLS)
9. Tool calls existing service method (e.g., PersonalFormService.createPersonalForm)
10. Service executes query via Supabase → returns data
11. Tool wraps response in toolSuccess() → MCP response to client
```

## File Structure

```
JKKN-Event-Form-Management/
├── app/api/mcp/
│   ├── route.ts              ← MCP endpoint + rate limiting
│   └── oauth/
│       └── route.ts          ← OAuth flow for Claude.ai
├── lib/mcp/
│   ├── auth.ts               ← verifyToken, extractAuth, hasMinimumRole
│   ├── helpers.ts            ← toolSuccess, toolError, createMcpSupabaseClient
│   └── tools.ts              ← 21 tool registrations
├── lib/services/
│   └── personal-form-service.ts  ← (modified: 4 methods accept supabaseClient?)
├── .mcp.json                 ← Claude Code connection config
├── FOROMM.md                 ← Plain-language docs
├── docs/SPEC.md              ← Full SDD spec
└── specs/mcp-server/         ← This handoff package
```

## Key Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `mcp-handler` | ^1.1.0 | Vercel's adapter — wraps MCP SDK for Next.js route handlers |
| `@modelcontextprotocol/sdk` | ^1.26.0 | Official MCP SDK — McpServer, AuthInfo types |

## Tool Registration Pattern

Every tool follows this exact shape:

```typescript
server.tool(
  'tool_name',                              // snake_case name
  'Description shown in Claude UI',         // human-readable
  { param: z.string().describe('...') },    // Zod schema (raw shape, NOT z.object())
  async (args, extra) => {                  // handler
    const { userId, role, token } = extractAuth(extra);
    const supabase = createMcpSupabaseClient(token);
    // Call existing service
    const result = await SomeService.method(args.param, supabase);
    return toolSuccess(result);
  }
);
```

## Auth Modes

| Mode | When | How |
|------|------|-----|
| Supabase JWT | Claude Code, direct API | `Authorization: Bearer <supabase_access_token>` |
| Google OAuth | Claude.ai connector | User clicks Google login → gets token → Claude.ai uses it |

## Rate Limiting

- 60 requests per minute per IP
- In-memory Map with 1-minute sliding window
- Stale entries pruned every 5 minutes
- Returns 429 with `Retry-After` and `X-RateLimit-*` headers
- Best-effort on Vercel serverless (no shared memory across invocations)

## Service Layer Integration

Tools call existing services. Four methods were patched to accept a server-side Supabase client:

| Method | Why Patched |
|--------|-------------|
| `getResponseStatistics(formId, supabaseClient?)` | Was browser-only; MCP needs server client |
| `exportToCSV(formId, userId, supabaseClient?)` | Same |
| `duplicateForm(sourceId, type, userId, supabaseClient?)` | Same |
| `updateCollaboratorPermissions(id, perms, supabaseClient?)` | Same |

All params are optional — existing browser callers are unaffected.

## All 21 Tools

| # | Tool | Category | Description |
|---|------|----------|-------------|
| 1 | `get_dashboard` | Dashboard | Aggregate stats (forms, events, responses) |
| 2 | `create_personal_form` | Personal Forms | Create form with fields |
| 3 | `list_personal_forms` | Personal Forms | List user's forms |
| 4 | `get_personal_form` | Personal Forms | Get form details |
| 5 | `update_personal_form` | Personal Forms | Update form settings/fields |
| 6 | `delete_personal_form` | Personal Forms | Delete form (owner only) |
| 7 | `get_personal_form_responses` | Personal Forms | Get submissions |
| 8 | `get_personal_form_stats` | Personal Forms | Submission statistics |
| 9 | `get_personal_form_analytics` | Personal Forms | Field-level analytics |
| 10 | `get_personal_form_insights` | Personal Forms | AI-powered insights (Claude Haiku) |
| 11 | `export_personal_form_responses` | Personal Forms | Export as CSV |
| 12 | `duplicate_personal_form` | Personal Forms | Copy form |
| 13 | `manage_personal_form_collaborators` | Personal Forms | Add/update/remove collaborators |
| 14 | `list_institutional_forms` | Institutional | List forms by institution |
| 15 | `create_institutional_form` | Institutional | Create form with institution scope |
| 16 | `get_institutional_form_responses` | Institutional | Get responses (RLS-scoped) |
| 17 | `list_events` | Events | List events with venue info |
| 18 | `create_event` | Events | Create event |
| 19 | `get_event` | Events | Get event details |
| 20 | `list_form_templates` | Utilities | Browse form templates |
| 21 | `search_users` | Utilities | Find users for collaboration |
