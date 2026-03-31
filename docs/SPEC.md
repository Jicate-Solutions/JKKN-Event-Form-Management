# JKKN AI Forms — MCP Server Specification

> **SDD Phase 1+2+3: Spec → Plan → Decompose**
> Generated: 2026-03-31
> Status: AWAITING APPROVAL

---

## 1. Overview

### What We're Building

An MCP (Model Context Protocol) server embedded in the JKKN Event Form Management application that allows JKKN staff to create forms, manage events, view responses, and generate reports through natural language conversation with Claude — instead of logging into `ai-forms.jicate.solutions` directly.

### Why It Matters

- **9 JKKN roles** (administrator, faculty, staff, super_admin, hod, etc.) currently must navigate a web UI to create forms
- With MCP, any authorized user can say: *"Create a feedback form for the pharmacy seminar with fields for name, rating, and comments"* — and Claude builds it
- Forms, responses, analytics, and AI insights become conversational
- Reference: Intent Interview Platform already proves this pattern works (12 tools, production-ready)

### Who Uses It

| User | How They Access | What They Can Do |
|------|----------------|------------------|
| JKKN Staff (via Claude.ai) | Claude.ai custom connector with OAuth | Create/manage personal forms, view responses, get AI insights |
| JKKN Staff (via Claude Code) | Local `.mcp.json` config | Same as above, plus development/debugging |
| Institution Coordinators | Same as staff | Additionally manage institutional forms and events |
| Super Admins | Same as staff | Full access to all forms, events, users across institutions |

---

## 2. Reference Architecture

### Proven Pattern: Intent Interview Platform MCP

| Aspect | Implementation |
|--------|---------------|
| **Library** | `mcp-handler` v1.1.0 (Vercel's adapter for Next.js) |
| **SDK** | `@modelcontextprotocol/sdk` v1.26.0 |
| **Transport** | Streamable HTTP (single endpoint, no Redis needed) |
| **Auth** | `withMcpAuth` wrapper — dual-mode (API key + Supabase JWT) |
| **OAuth** | Separate `/api/mcp/oauth` route with HTML login page for Claude.ai |
| **Tool pattern** | Thin wrappers over existing service layer — no business logic duplication |
| **Input validation** | Zod schemas inline in `server.tool()` calls |
| **Error handling** | Shared `toolError()` helper for consistent error shape |
| **Source files** | 4 files total: route.ts, tools.ts, oauth.ts, server.ts |
| **RBAC** | Per-tool auth check via `extractAuth(extra)` from `extra.authInfo` |

We will follow this pattern exactly, adapted for the AI Forms domain.

---

## 3. Existing App Architecture

### Database (Supabase Project: `oinusagylrdshrydvmpp`)

**15 tables**, key ones for MCP:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User accounts | id, email, full_name, role (7 roles), is_active |
| `institutions` | Multi-tenant orgs | id, name, coordinator_id |
| `events` | Events | id, title, start/end_time, status, institution_id, has_registration_form |
| `forms` | Institutional forms | id, title, fields (JSONB), status, institution_id, event_id, slug, is_public |
| `form_responses` | Institutional submissions | id, form_id, response_data (JSONB), payment_status, submission_id |
| `personal_forms` | User-created forms | id, title, fields (JSONB), status, slug, restrict_domain, allowed_domains |
| `personal_form_responses` | Personal form submissions | id, personal_form_id, response_data (JSONB), submission_id |
| `form_templates` | Reusable templates | id, title, category, fields (JSONB) |
| `form_collaborators` | Form sharing | id, form_id, user_id, permission_level |
| `personal_form_collaborators` | Granular permissions | id, personal_form_id, user_id, can_edit/view/export/manage |
| `places` | Event venues | id, name, capacity, location |

### Services Layer (15 services)

| Service | Key Operations |
|---------|---------------|
| `FormService` | CRUD forms, submit responses, get responses (role-based), export, templates, stats |
| `PersonalFormService` | CRUD personal forms, collaborators, responses, export, MYJKKN autofetch |
| `PersonalFormAnalyticsService` | Overview metrics, field analytics, trends, distributions |
| `AIInsightsService` | Claude API analysis of form data → actionable insights |
| `EventService` | CRUD events, place availability, status management |
| `DashboardService` | Aggregate stats across forms/events/users |
| `EmailService` | Submission confirmation emails via Resend |
| `OrganizationService` | CRUD institutions |
| `DepartmentService` | CRUD departments |
| `PlaceService` | CRUD venues |
| `UserService` | User CRUD, role management |

### Form Field Types (15 types)

`text`, `number`, `email`, `textarea`, `select`, `checkbox`, `radio`, `date`, `time`, `file`, `signature`, `payment`, `conditional`, `image`

### Auth System

- Google OAuth via Supabase Auth
- 7 roles: `super_admin > administrator > institution_coordinator > event_coordinator > staff > student > public`
- Existing `withAuthApi()` wrapper validates sessions and optionally checks roles
- Multi-institution scoping via junction tables (institution_coordinators, department_coordinators, event_coordinators)

---

## 4. MCP Tool Specifications

### 4.1 Personal Form Tools (Primary — highest value)

#### `create_personal_form`
**Description:** Create a new personal form with specified fields.
**Parameters:**
```
title: string (required) — Form title
description: string (optional) — Form description
fields: FormField[] (required) — Array of form field definitions
  Each field: { type, label, required, placeholder?, options?, validation?, payment_amount?, conditional_rules? }
is_public: boolean (default: true) — Whether form is publicly accessible
submission_limit: number (optional) — Max submissions allowed
restrict_domain: boolean (default: false) — Restrict to specific email domains
allowed_domains: string[] (optional) — Allowed email domains when restricted
```
**Returns:** Created form with id, slug, and public URL
**Auth:** Any authenticated user

#### `list_personal_forms`
**Description:** List all personal forms owned by or shared with the current user.
**Parameters:**
```
status: "draft" | "published" | "archived" (optional) — Filter by status
search: string (optional) — Search by title
limit: number (default: 20) — Max results
offset: number (default: 0) — Pagination offset
```
**Returns:** Array of forms with title, status, response count, created date
**Auth:** Any authenticated user (sees own + collaborated forms)

#### `get_personal_form`
**Description:** Get full details of a specific personal form including fields and settings.
**Parameters:**
```
form_id: string (required, UUID) — Form ID
```
**Returns:** Complete form object with all fields, settings, collaborators
**Auth:** Owner or collaborator with view permission

#### `update_personal_form`
**Description:** Update a personal form's settings, fields, or status.
**Parameters:**
```
form_id: string (required, UUID) — Form ID
title: string (optional) — New title
description: string (optional) — New description
fields: FormField[] (optional) — Updated field definitions
status: "draft" | "published" | "archived" (optional) — New status
is_public: boolean (optional) — Public access toggle
submission_limit: number (optional) — Max submissions
```
**Returns:** Updated form object
**Auth:** Owner or collaborator with edit permission

#### `delete_personal_form`
**Description:** Delete a personal form and all its responses.
**Parameters:**
```
form_id: string (required, UUID) — Form ID
```
**Returns:** Confirmation message
**Auth:** Owner only

#### `get_personal_form_responses`
**Description:** Get all responses submitted to a personal form.
**Parameters:**
```
form_id: string (required, UUID) — Form ID
limit: number (default: 50) — Max results
offset: number (default: 0) — Pagination
```
**Returns:** Array of responses with submission_id, response_data, user_email, timestamp
**Auth:** Owner or collaborator with view_responses permission

#### `get_personal_form_stats`
**Description:** Get submission statistics for a personal form.
**Parameters:**
```
form_id: string (required, UUID) — Form ID
```
**Returns:** Total submissions, recent submissions, completion rate, submission trends
**Auth:** Owner or collaborator with view_responses permission

#### `get_personal_form_analytics`
**Description:** Get detailed analytics including field-level breakdowns, trends, and distributions.
**Parameters:**
```
form_id: string (required, UUID) — Form ID
```
**Returns:** Overview metrics, per-field analytics (value distributions, averages), time trends, day/hour heatmap
**Auth:** Owner or collaborator with view_responses permission

#### `get_personal_form_insights`
**Description:** Get AI-powered insights analyzing form response patterns using Claude.
**Parameters:**
```
form_id: string (required, UUID) — Form ID
```
**Returns:** 4-6 actionable insights (growth trends, peak times, field recommendations)
**Auth:** Owner or collaborator with view_responses permission

#### `export_personal_form_responses`
**Description:** Export form responses as CSV or Excel data.
**Parameters:**
```
form_id: string (required, UUID) — Form ID
format: "csv" | "excel" (default: "csv") — Export format
```
**Returns:** Formatted response data (CSV string or base64-encoded Excel)
**Auth:** Owner or collaborator with export permission

#### `duplicate_personal_form`
**Description:** Create a copy of an existing personal form.
**Parameters:**
```
form_id: string (required, UUID) — Source form ID
new_title: string (optional) — Title for the copy (defaults to "Copy of {original}")
```
**Returns:** New form object with id, slug, public URL
**Auth:** Owner or collaborator with view permission

#### `manage_personal_form_collaborators`
**Description:** Add, update, or remove collaborators on a personal form.
**Parameters:**
```
form_id: string (required, UUID) — Form ID
action: "add" | "update" | "remove" (required)
user_email: string (required) — Collaborator's email
permissions: object (required for add/update) — { can_edit_structure, can_view_responses, can_export_data, can_manage_collaborators }
```
**Returns:** Updated collaborator list
**Auth:** Owner or collaborator with manage_collaborators permission

### 4.2 Institutional Form Tools

#### `create_form`
**Description:** Create a new institutional form, optionally linked to an event.
**Parameters:**
```
title: string (required) — Form title
fields: FormField[] (required) — Field definitions
institution_id: string (required, UUID) — Institution
event_id: string (optional, UUID) — Link to an event
is_public: boolean (default: true)
submission_limit: number (optional)
```
**Returns:** Created form with id, slug, URL
**Auth:** institution_coordinator+ for that institution

#### `list_forms`
**Description:** List institutional forms with role-based filtering.
**Parameters:**
```
institution_id: string (optional, UUID) — Filter by institution
event_id: string (optional, UUID) — Filter by event
status: "draft" | "published" | "archived" (optional)
search: string (optional)
```
**Returns:** Array of forms
**Auth:** Role-based (super_admin sees all, coordinators see their institution)

#### `get_form_responses`
**Description:** Get responses for an institutional form.
**Parameters:**
```
form_id: string (required, UUID)
limit: number (default: 50)
offset: number (default: 0)
```
**Returns:** Responses with payment status info
**Auth:** Role-based cascading access (super_admin → admin → coordinator → creator → own)

### 4.3 Event Management Tools

#### `list_events`
**Description:** List events with filtering.
**Parameters:**
```
institution_id: string (optional, UUID)
status: "upcoming" | "ongoing" | "completed" (optional)
search: string (optional)
limit: number (default: 20)
```
**Returns:** Events with title, time, place, status, registration form info
**Auth:** Role-based

#### `create_event`
**Description:** Create a new event.
**Parameters:**
```
title: string (required)
start_time: string (required, ISO datetime)
end_time: string (required, ISO datetime)
institution_id: string (required, UUID)
department_id: string (optional, UUID)
place_id: string (optional, UUID)
has_registration_form: boolean (default: false)
```
**Returns:** Created event object
**Auth:** institution_coordinator+ for that institution

#### `get_event`
**Description:** Get full event details including linked forms and coordinators.
**Parameters:**
```
event_id: string (required, UUID)
```
**Returns:** Complete event with place info, coordinators, linked forms
**Auth:** Any authenticated user (filtered by role)

### 4.4 Dashboard & Utility Tools

#### `get_dashboard`
**Description:** Get aggregate statistics — total forms, responses, events, users.
**Parameters:** None
**Returns:** Dashboard metrics object
**Auth:** Any authenticated user (scoped to their access level)

#### `list_form_templates`
**Description:** List available form templates that can be used as starting points.
**Parameters:**
```
category: string (optional) — Filter by category
```
**Returns:** Templates with title, category, field preview
**Auth:** Any authenticated user

#### `search_users`
**Description:** Search for users by name or email (for adding collaborators).
**Parameters:**
```
query: string (required) — Search term
limit: number (default: 10)
```
**Returns:** Matching users with name, email, role
**Auth:** Any authenticated user

---

## 5. Authentication Design

### Dual-Mode Auth (following Intent Interview Platform pattern)

#### Mode 1: Supabase JWT (Claude Code / direct API)
```
Authorization: Bearer <supabase_access_token>
```
- Validated via `supabase.auth.getUser(token)`
- Returns user ID, email, role from profile
- Used by Claude Code local connections

#### Mode 2: OAuth Flow (Claude.ai custom connector)
```
1. Claude.ai redirects to /api/mcp/oauth?action=authorize&state=...&redirect_uri=...
2. User sees Google OAuth login page (Supabase Auth)
3. On success, redirect back to Claude.ai with access_token
4. Claude.ai uses token for subsequent MCP calls
```
- Login via existing Google OAuth (same as the web app)
- Token includes user's role and institution access
- No new auth system needed — reuses Supabase Auth entirely

### RBAC in MCP Tools

```typescript
function extractAuth(extra: { authInfo?: AuthInfo }): { role: UserRole; userId: string } {
  // Pull role from authInfo.scopes[0], userId from authInfo.clientId
}

// Per-tool access check
function checkFormAccess(role: UserRole, userId: string, formId: string): ErrorResponse | null {
  // super_admin: all forms
  // administrator: forms in their institutions
  // institution_coordinator: forms in their institution
  // event_coordinator: forms linked to their events
  // staff/student: own forms only
}
```

---

## 6. Technical Plan

### File Structure (new files only)

```
src/
  app/
    api/
      mcp/
        route.ts          # MCP endpoint handler (GET/POST/DELETE)
        oauth/
          route.ts        # OAuth flow for Claude.ai connector
  lib/
    mcp/
      tools.ts            # All tool registrations (~20 tools)
      auth.ts             # extractAuth, verifyToken, RBAC helpers
      helpers.ts          # toolError, response formatters
```

**Total new files: 5** (following the lean pattern)

### Dependencies to Add

```json
{
  "mcp-handler": "^1.1.0",
  "@modelcontextprotocol/sdk": "^1.26.0"
}
```

### No Changes to Existing Code

- All tools call existing services (FormService, PersonalFormService, etc.)
- No database schema changes
- No new tables or columns
- Auth reuses existing Supabase Auth + withAuthApi patterns
- The MCP server is purely an **additional interface** to existing functionality

---

## 7. Implementation Phases

### Phase 1: Foundation (Scaffold + Auth)
**Goal:** MCP endpoint responds to tool discovery, auth works

| # | Task | Files | Verification |
|---|------|-------|-------------|
| 1.1 | Install `mcp-handler` and `@modelcontextprotocol/sdk` | `package.json` | `npm install` succeeds |
| 1.2 | Create MCP route handler with `createMcpHandler` | `src/app/api/mcp/route.ts` | GET /api/mcp returns MCP protocol response |
| 1.3 | Implement `verifyToken` with Supabase JWT validation | `src/lib/mcp/auth.ts` | Token validation works with existing user sessions |
| 1.4 | Wire `withMcpAuth` wrapper on route | `src/app/api/mcp/route.ts` | Unauthenticated requests get tool list, authenticated get full access |
| 1.5 | Create `toolError` and response helpers | `src/lib/mcp/helpers.ts` | Helper functions return correct MCP response shapes |
| 1.6 | Register one test tool (`get_dashboard`) | `src/lib/mcp/tools.ts` | Claude Code can call `get_dashboard` and get real data |

**Exit criteria:** `curl -X POST http://localhost:3000/api/mcp` returns MCP protocol response with 1 tool listed. Authenticated call to `get_dashboard` returns real stats.

### Phase 2: Personal Form Tools (Core Value)
**Goal:** Full CRUD + analytics for personal forms via MCP

| # | Task | Files | Verification |
|---|------|-------|-------------|
| 2.1 | `create_personal_form` tool | `src/lib/mcp/tools.ts` | Create a form via Claude, verify in web UI |
| 2.2 | `list_personal_forms` tool | `src/lib/mcp/tools.ts` | List returns user's forms |
| 2.3 | `get_personal_form` tool | `src/lib/mcp/tools.ts` | Returns full form with fields |
| 2.4 | `update_personal_form` tool | `src/lib/mcp/tools.ts` | Update title/fields/status, verify in UI |
| 2.5 | `delete_personal_form` tool | `src/lib/mcp/tools.ts` | Delete form, confirm gone in UI |
| 2.6 | `get_personal_form_responses` tool | `src/lib/mcp/tools.ts` | Returns response data |
| 2.7 | `get_personal_form_stats` tool | `src/lib/mcp/tools.ts` | Returns submission stats |
| 2.8 | `get_personal_form_analytics` tool | `src/lib/mcp/tools.ts` | Returns field-level analytics |
| 2.9 | `get_personal_form_insights` tool | `src/lib/mcp/tools.ts` | Returns AI-generated insights |
| 2.10 | `export_personal_form_responses` tool | `src/lib/mcp/tools.ts` | Returns CSV/Excel data |
| 2.11 | `duplicate_personal_form` tool | `src/lib/mcp/tools.ts` | Duplicates form, verify copy exists |
| 2.12 | `manage_personal_form_collaborators` tool | `src/lib/mcp/tools.ts` | Add/update/remove collaborators |

**Exit criteria:** All 12 personal form tools work end-to-end. Can create a form conversationally, publish it, view responses, get AI insights, and export data — all without touching the web UI.

### Phase 3: Institutional Forms + Events
**Goal:** Institution-scoped form and event management

| # | Task | Files | Verification |
|---|------|-------|-------------|
| 3.1 | `create_form` (institutional) tool | `src/lib/mcp/tools.ts` | Create form with institution_id, verify RBAC |
| 3.2 | `list_forms` (institutional) tool | `src/lib/mcp/tools.ts` | Returns institution-scoped forms |
| 3.3 | `get_form_responses` tool | `src/lib/mcp/tools.ts` | Role-based response access works |
| 3.4 | `list_events` tool | `src/lib/mcp/tools.ts` | Returns events filtered by institution |
| 3.5 | `create_event` tool | `src/lib/mcp/tools.ts` | Create event with place/department |
| 3.6 | `get_event` tool | `src/lib/mcp/tools.ts` | Returns full event details |

**Exit criteria:** Institutional coordinators can manage forms/events for their institution. RBAC prevents cross-institution access.

### Phase 4: Utilities + OAuth
**Goal:** Template browsing, user search, Claude.ai connector

| # | Task | Files | Verification |
|---|------|-------|-------------|
| 4.1 | `list_form_templates` tool | `src/lib/mcp/tools.ts` | Returns available templates |
| 4.2 | `search_users` tool | `src/lib/mcp/tools.ts` | Search returns matching users |
| 4.3 | OAuth route for Claude.ai connector | `src/app/api/mcp/oauth/route.ts` | Google OAuth login → token → Claude.ai redirect |
| 4.4 | Claude.ai custom connector config | Documentation | Claude.ai connector setup instructions |
| 4.5 | `.mcp.json` for Claude Code | `.mcp.json` | Claude Code connects locally |

**Exit criteria:** MCP server works from both Claude Code (local) and Claude.ai (OAuth). Staff can connect their Claude.ai account and start creating forms conversationally.

### Phase 5: Quality & Documentation
**Goal:** Production hardening

| # | Task | Files | Verification |
|---|------|-------|-------------|
| 5.1 | Rate limiting on MCP endpoint | `src/app/api/mcp/route.ts` | Excessive requests are throttled |
| 5.2 | Input sanitization review | `src/lib/mcp/tools.ts` | All Zod schemas validate properly |
| 5.3 | Error handling audit | All MCP files | All tools return proper errors, no unhandled exceptions |
| 5.4 | FOROMM.md documentation | `FOROMM.md` | Plain-language explanation of the MCP system |
| 5.5 | Deploy and verify on Vercel | Vercel | Production MCP endpoint responds correctly |

**Exit criteria:** MCP server is production-ready, documented, and deployed.

---

## 8. Assumptions & Risks

### Assumptions
- [ASSUMPTION] The existing `PersonalFormService` and `FormService` can be called from MCP tool handlers with a Supabase client constructed from the user's JWT — same pattern as API routes
- [ASSUMPTION] `mcp-handler` v1.1.0 works with Next.js 16 (the Intent Interview Platform uses Next.js 15 — may need version compatibility check)
- [ASSUMPTION] Supabase Auth tokens obtained via Google OAuth include sufficient claims for role-based access
- [ASSUMPTION] The app's Vercel deployment has enough function timeout (60s) for MCP streaming

### Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| `mcp-handler` incompatible with Next.js 16 | Blocks Phase 1 | Test early; fallback to raw `@modelcontextprotocol/sdk` |
| Service layer expects browser Supabase client | Tools fail | Use `createServerClient` or service-role client with RLS bypass |
| OAuth flow complexity for Claude.ai | Phase 4 delayed | Implement Claude Code connection first (simpler) |
| Form field JSONB is complex to describe in MCP schema | Poor UX | Provide simplified field builder with smart defaults |

---

## 9. Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| **Functional** | All 20 tools work end-to-end with real data |
| **Auth** | RBAC correctly scopes data per user role |
| **UX** | A staff member can create, publish, and analyze a form entirely through conversation |
| **Performance** | Tool responses return within 5 seconds |
| **Security** | No cross-user or cross-institution data leakage |
| **Deployment** | Works on both Claude Code (local) and Claude.ai (OAuth) |

---

## 10. Out of Scope

- Payment processing via MCP (Razorpay requires browser redirect — stays in web UI)
- File upload handling (signatures, file fields — stays in web UI)
- Real-time form response notifications
- Modifying the existing web UI
- Adding new database tables or columns

---

*Spec version: 1.0 | Author: Claude (SDD Phase 1) | APPROVED*

---
---

# IMPLEMENTATION PLAN — SDD Phase 2+3

> **Detailed technical plan with bite-sized tasks**
> Generated: 2026-03-31
> Status: AWAITING APPROVAL

## Critical Path Analysis

```
Phase 1 (Foundation) → Phase 2 (Personal Forms) → Phase 3 (Institutional) → Phase 4 (OAuth) → Phase 5 (Quality)
     │                       │                          │                         │
     │ SEQUENTIAL            │ SEQUENTIAL               │ CAN PARALLEL            │ SEQUENTIAL
     │ (each task depends    │ (tools build on           │ with Phase 2            │ (needs all
     │  on previous)         │  foundation auth)         │ (different services)     │  tools done)
```

**Key constraint:** No `src/` directory in this project — all files live at root (`app/`, `lib/`, `types/`).

**Key constraint:** `FormService`, `EventService`, `DashboardService` use browser-only `createClientSupabaseClient()`. MCP tools run server-side, so we must pass `createServerSupabaseClient()` or use admin client. `PersonalFormService` already accepts optional `supabaseClient` parameter — no issue there.

---

## Phase 1: Foundation (Scaffold + Auth)

### Task 1.1 — Install MCP dependencies

**Files:** `package.json`
**What:** Add `mcp-handler` and `@modelcontextprotocol/sdk`
**Exact command:**
```bash
cd /Users/omm/PROJECTS/JKKN-Event-Form-Management
npm install mcp-handler@^1.1.0 @modelcontextprotocol/sdk@^1.26.0
```
**Verify:** `npm ls mcp-handler @modelcontextprotocol/sdk` shows both installed
**Time estimate:** 2 min

---

### Task 1.2 — Create MCP auth helpers

**File:** `lib/mcp/auth.ts`
**What:** Token verification and role extraction functions
**Depends on:** Task 1.1

```typescript
// lib/mcp/auth.ts
import { createClient } from '@supabase/supabase-js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Verify a bearer token from MCP request.
 * Supports Supabase JWT tokens (from Google OAuth).
 * Returns AuthInfo with userId as clientId and role in scopes.
 */
export async function verifyToken(
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  try {
    // Create a one-off Supabase client with the user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return undefined;

    // Fetch user's role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'public';

    return {
      token: bearerToken,
      clientId: user.id,
      scopes: [role],
    };
  } catch {
    return undefined;
  }
}

/**
 * Extract auth info from MCP extra parameter.
 * Returns userId and role, or throws if unauthenticated.
 */
export function extractAuth(extra: { authInfo?: AuthInfo }): {
  userId: string;
  role: string;
  token: string;
} {
  const authInfo = extra.authInfo;
  if (!authInfo?.clientId) {
    throw new Error('Authentication required');
  }
  return {
    userId: authInfo.clientId,
    role: authInfo.scopes?.[0] || 'public',
    token: authInfo.token,
  };
}

/**
 * Check if a role has at least the required access level.
 * Hierarchy: super_admin > administrator > institution_coordinator > event_coordinator > staff > student > public
 */
const ROLE_HIERARCHY = [
  'super_admin',
  'administrator',
  'institution_coordinator',
  'event_coordinator',
  'staff',
  'student',
  'public',
];

export function hasMinimumRole(userRole: string, requiredRole: string): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);
  if (userIndex === -1 || requiredIndex === -1) return false;
  return userIndex <= requiredIndex;
}
```

**Verify:** File compiles without errors (`npx tsc --noEmit lib/mcp/auth.ts` or build)

---

### Task 1.3 — Create MCP response helpers

**File:** `lib/mcp/helpers.ts`
**What:** Shared response formatting functions
**Depends on:** Task 1.1

```typescript
// lib/mcp/helpers.ts

/**
 * Format a successful MCP tool response.
 */
export function toolSuccess(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Format an MCP tool error response.
 */
export function toolError(message: string, error?: unknown) {
  const details = error instanceof Error ? error.message : String(error || '');
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ error: message, details }, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Create a Supabase server client from a bearer token for use in MCP tools.
 * This lets tools run queries as the authenticated user (respecting RLS).
 */
export async function createMcpSupabaseClient(token: string) {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );
}
```

**Verify:** File compiles

---

### Task 1.4 — Create MCP route handler

**File:** `app/api/mcp/route.ts`
**What:** The main MCP endpoint using `createMcpHandler` + `withMcpAuth`
**Depends on:** Tasks 1.2, 1.3

```typescript
// app/api/mcp/route.ts
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { verifyToken } from '@/lib/mcp/auth';
import { registerTools } from '@/lib/mcp/tools';

const baseHandler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {
    serverInfo: {
      name: 'JKKN AI Forms',
      version: '1.0.0',
    },
  },
  {
    basePath: '/api',
    streamableHttpEndpoint: '/mcp',
    maxDuration: 60,
  }
);

const handler = withMcpAuth(baseHandler, verifyToken, {
  required: false, // Allow tool listing without auth
});

export { handler as GET, handler as POST, handler as DELETE };
```

**Verify:** `curl -X POST http://localhost:3000/api/mcp` returns MCP protocol response (may be error, but not 404)

---

### Task 1.5 — Create tools.ts with first tool (get_dashboard)

**File:** `lib/mcp/tools.ts`
**What:** Tool registration module with one working tool to validate the entire pipeline
**Depends on:** Tasks 1.2, 1.3, 1.4

```typescript
// lib/mcp/tools.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { extractAuth } from '@/lib/mcp/auth';
import { toolSuccess, toolError, createMcpSupabaseClient } from '@/lib/mcp/helpers';

export function registerTools(server: McpServer) {
  // ─── Dashboard ────────────────────────────────────────
  server.tool(
    'get_dashboard',
    'Get aggregate statistics — total forms, responses, events, users. Returns dashboard metrics scoped to the authenticated user.',
    {},
    async (_args, extra) => {
      try {
        const { token } = extractAuth(extra);
        const supabase = await createMcpSupabaseClient(token);

        // Parallel queries for dashboard stats
        const [formsResult, personalFormsResult, eventsResult] = await Promise.all([
          supabase.from('forms').select('id', { count: 'exact', head: true }),
          supabase.from('personal_forms').select('id', { count: 'exact', head: true }),
          supabase.from('events').select('id', { count: 'exact', head: true }),
        ]);

        return toolSuccess({
          institutional_forms: formsResult.count || 0,
          personal_forms: personalFormsResult.count || 0,
          events: eventsResult.count || 0,
        });
      } catch (error) {
        return toolError('Failed to get dashboard stats', error);
      }
    }
  );
}
```

**Verify:**
1. Start dev server: `npm run dev`
2. Test MCP endpoint: `curl -X POST http://localhost:3000/api/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`
3. Should return JSON with `get_dashboard` in the tools list

**Exit criteria for Phase 1:** MCP endpoint is live, auth works, one tool returns real data.

---

## Phase 2: Personal Form Tools (Core Value)

All tasks in this phase add tools to `lib/mcp/tools.ts` inside the `registerTools` function.

### Task 2.1 — `create_personal_form` tool

**Depends on:** Phase 1 complete

```typescript
server.tool(
  'create_personal_form',
  'Create a new personal form with specified fields. Each field needs a type (text, number, email, textarea, select, checkbox, radio, date, time) and a label. For select/radio/checkbox fields, provide options array. Returns the created form with its public URL.',
  {
    title: z.string().min(1).describe('Form title'),
    description: z.string().optional().describe('Form description'),
    fields: z.array(z.object({
      type: z.enum(['text', 'number', 'email', 'textarea', 'select', 'checkbox', 'radio', 'date', 'time']).describe('Field type'),
      label: z.string().describe('Field label shown to respondents'),
      required: z.boolean().default(true).describe('Whether field is required'),
      placeholder: z.string().optional().describe('Placeholder text'),
      options: z.array(z.string()).optional().describe('Options for select/radio/checkbox fields'),
    })).min(1).describe('Form fields — at least one required'),
    is_public: z.boolean().default(true).describe('Whether form is publicly accessible'),
    status: z.enum(['draft', 'published']).default('published').describe('Form status'),
    submission_limit: z.number().optional().describe('Maximum number of submissions allowed'),
    restrict_domain: z.boolean().default(false).describe('Restrict submissions to specific email domains'),
    allowed_domains: z.array(z.string()).optional().describe('Allowed email domains when restrict_domain is true'),
  },
  async (args, extra) => {
    try {
      const { userId, token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);

      // Build fields with IDs
      const fields = args.fields.map((f, i) => ({
        id: `field_${Date.now()}_${i}`,
        ...f,
      }));

      const { PersonalFormService } = await import('@/lib/services/personal-form-service');
      const form = await PersonalFormService.createPersonalForm(
        {
          title: args.title,
          description: args.description || '',
          fields,
          status: args.status,
          is_public: args.is_public,
          submission_limit: args.submission_limit || null,
          restrict_domain: args.restrict_domain,
          allowed_domains: args.allowed_domains || [],
          created_by: userId,
        },
        supabase
      );

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ai-forms.jicate.solutions';
      return toolSuccess({
        id: form.id,
        title: form.title,
        slug: form.slug,
        status: form.status,
        public_url: `${appUrl}/forms/public/${form.id}`,
        field_count: fields.length,
        message: `Form "${form.title}" created successfully`,
      });
    } catch (error) {
      return toolError('Failed to create form', error);
    }
  }
);
```

**Verify:** Call tool via MCP, then check web UI at ai-forms.jicate.solutions to confirm form exists

---

### Task 2.2 — `list_personal_forms` tool

```typescript
server.tool(
  'list_personal_forms',
  'List all personal forms owned by or shared with the current user. Shows title, status, response count, and creation date.',
  {
    status: z.enum(['draft', 'published', 'archived']).optional().describe('Filter by form status'),
    search: z.string().optional().describe('Search by form title'),
    limit: z.number().default(20).describe('Max results to return'),
    offset: z.number().default(0).describe('Pagination offset'),
  },
  async (args, extra) => {
    try {
      const { userId, token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);
      const { PersonalFormService } = await import('@/lib/services/personal-form-service');

      const result = await PersonalFormService.getPersonalForms(
        {
          status: args.status,
          search: args.search,
          limit: args.limit,
          offset: args.offset,
        },
        userId,
        supabase
      );

      return toolSuccess({
        forms: result.data?.map((f: any) => ({
          id: f.id,
          title: f.title,
          status: f.status,
          response_count: f.response_count || 0,
          created_at: f.created_at,
          is_public: f.is_public,
        })) || [],
        total: result.total || 0,
        limit: args.limit,
        offset: args.offset,
      });
    } catch (error) {
      return toolError('Failed to list forms', error);
    }
  }
);
```

---

### Task 2.3 — `get_personal_form` tool

```typescript
server.tool(
  'get_personal_form',
  'Get full details of a specific personal form including all fields, settings, and collaborators.',
  {
    form_id: z.string().uuid().describe('Form ID (UUID)'),
  },
  async (args, extra) => {
    try {
      const { userId, token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);
      const { PersonalFormService } = await import('@/lib/services/personal-form-service');

      const form = await PersonalFormService.getPersonalForm(args.form_id, userId, supabase);
      if (!form) return toolError('Form not found');

      return toolSuccess(form);
    } catch (error) {
      return toolError('Failed to get form', error);
    }
  }
);
```

---

### Task 2.4 — `update_personal_form` tool

```typescript
server.tool(
  'update_personal_form',
  'Update a personal form — change title, description, fields, status, or settings. Only include fields you want to change.',
  {
    form_id: z.string().uuid().describe('Form ID to update'),
    title: z.string().optional().describe('New title'),
    description: z.string().optional().describe('New description'),
    fields: z.array(z.object({
      id: z.string().optional().describe('Existing field ID (omit for new fields)'),
      type: z.enum(['text', 'number', 'email', 'textarea', 'select', 'checkbox', 'radio', 'date', 'time']),
      label: z.string(),
      required: z.boolean().default(true),
      placeholder: z.string().optional(),
      options: z.array(z.string()).optional(),
    })).optional().describe('Updated field definitions (replaces all fields)'),
    status: z.enum(['draft', 'published', 'archived']).optional().describe('New status'),
    is_public: z.boolean().optional().describe('Public access toggle'),
    submission_limit: z.number().nullable().optional().describe('Max submissions (null for unlimited)'),
  },
  async (args, extra) => {
    try {
      const { userId, token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);
      const { PersonalFormService } = await import('@/lib/services/personal-form-service');

      const updates: any = {};
      if (args.title !== undefined) updates.title = args.title;
      if (args.description !== undefined) updates.description = args.description;
      if (args.status !== undefined) updates.status = args.status;
      if (args.is_public !== undefined) updates.is_public = args.is_public;
      if (args.submission_limit !== undefined) updates.submission_limit = args.submission_limit;
      if (args.fields !== undefined) {
        updates.fields = args.fields.map((f, i) => ({
          id: f.id || `field_${Date.now()}_${i}`,
          ...f,
        }));
      }

      const form = await PersonalFormService.updatePersonalForm(
        args.form_id,
        updates,
        userId,
        supabase
      );

      return toolSuccess({
        ...form,
        message: `Form "${form.title}" updated successfully`,
      });
    } catch (error) {
      return toolError('Failed to update form', error);
    }
  }
);
```

---

### Task 2.5 — `delete_personal_form` tool

```typescript
server.tool(
  'delete_personal_form',
  'Permanently delete a personal form and all its responses. This action cannot be undone.',
  {
    form_id: z.string().uuid().describe('Form ID to delete'),
  },
  async (args, extra) => {
    try {
      const { userId, token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);
      const { PersonalFormService } = await import('@/lib/services/personal-form-service');

      // Verify ownership first
      const form = await PersonalFormService.getPersonalForm(args.form_id, userId, supabase);
      if (!form) return toolError('Form not found');

      await PersonalFormService.deletePersonalForm(args.form_id, supabase);
      return toolSuccess({ message: `Form "${form.title}" deleted successfully` });
    } catch (error) {
      return toolError('Failed to delete form', error);
    }
  }
);
```

---

### Task 2.6 — `get_personal_form_responses` tool

```typescript
server.tool(
  'get_personal_form_responses',
  'Get all responses submitted to a personal form. Returns submission data, user email, and timestamps.',
  {
    form_id: z.string().uuid().describe('Form ID'),
    limit: z.number().default(50).describe('Max results'),
    offset: z.number().default(0).describe('Pagination offset'),
    search: z.string().optional().describe('Search in responses'),
  },
  async (args, extra) => {
    try {
      const { userId, token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);
      const { PersonalFormService } = await import('@/lib/services/personal-form-service');

      const page = Math.floor(args.offset / args.limit) + 1;
      const result = await PersonalFormService.getResponses(
        args.form_id, userId, page, args.limit, supabase, args.search
      );

      return toolSuccess({
        responses: result.data || [],
        total: result.total || 0,
        page,
        limit: args.limit,
      });
    } catch (error) {
      return toolError('Failed to get responses', error);
    }
  }
);
```

---

### Task 2.7 — `get_personal_form_stats` tool

```typescript
server.tool(
  'get_personal_form_stats',
  'Get submission statistics for a personal form — total count, submission limit status, and whether form can still accept submissions.',
  {
    form_id: z.string().uuid().describe('Form ID'),
  },
  async (args, extra) => {
    try {
      const { token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);
      const { PersonalFormService } = await import('@/lib/services/personal-form-service');

      const stats = await PersonalFormService.getResponseStatistics(args.form_id);
      return toolSuccess(stats);
    } catch (error) {
      return toolError('Failed to get form stats', error);
    }
  }
);
```

---

### Task 2.8 — `get_personal_form_analytics` tool

```typescript
server.tool(
  'get_personal_form_analytics',
  'Get detailed analytics for a personal form — field-level breakdowns, value distributions, response trends over time, and day/hour heatmaps.',
  {
    form_id: z.string().uuid().describe('Form ID'),
  },
  async (args, extra) => {
    try {
      const { userId, token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);
      const { PersonalFormAnalyticsService } = await import('@/lib/services/personal-form-analytics-service');

      const [overview, fieldStats] = await Promise.all([
        PersonalFormAnalyticsService.getAnalyticsSummary(args.form_id, undefined, supabase),
        PersonalFormAnalyticsService.getFieldStatistics(args.form_id, undefined, supabase),
      ]);

      return toolSuccess({ overview, field_analytics: fieldStats });
    } catch (error) {
      return toolError('Failed to get analytics', error);
    }
  }
);
```

---

### Task 2.9 — `get_personal_form_insights` tool

```typescript
server.tool(
  'get_personal_form_insights',
  'Get AI-powered insights analyzing form response patterns. Uses Claude to generate 4-6 actionable insights about trends, peak submission times, and recommendations.',
  {
    form_id: z.string().uuid().describe('Form ID'),
  },
  async (args, extra) => {
    try {
      const { userId, token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);

      const { PersonalFormAnalyticsService } = await import('@/lib/services/personal-form-analytics-service');
      const { AIInsightsService } = await import('@/lib/services/ai-insights-service');

      const [overview, fieldStats] = await Promise.all([
        PersonalFormAnalyticsService.getAnalyticsSummary(args.form_id, undefined, supabase),
        PersonalFormAnalyticsService.getFieldStatistics(args.form_id, undefined, supabase),
      ]);

      const insights = await AIInsightsService.generateInsights({
        overview,
        fieldAnalytics: fieldStats,
      });

      return toolSuccess({ insights });
    } catch (error) {
      return toolError('Failed to generate insights', error);
    }
  }
);
```

---

### Task 2.10 — `export_personal_form_responses` tool

```typescript
server.tool(
  'export_personal_form_responses',
  'Export all responses for a personal form as CSV text. Useful for downloading or analyzing response data.',
  {
    form_id: z.string().uuid().describe('Form ID'),
  },
  async (args, extra) => {
    try {
      const { userId, token } = extractAuth(extra);
      const { PersonalFormService } = await import('@/lib/services/personal-form-service');

      const csv = await PersonalFormService.exportToCSV(args.form_id, userId);
      return toolSuccess({ format: 'csv', data: csv });
    } catch (error) {
      return toolError('Failed to export responses', error);
    }
  }
);
```

---

### Task 2.11 — `duplicate_personal_form` tool

```typescript
server.tool(
  'duplicate_personal_form',
  'Create a copy of an existing personal form with all its fields and settings. The copy starts with zero responses.',
  {
    form_id: z.string().uuid().describe('Source form ID to duplicate'),
    new_title: z.string().optional().describe('Title for the copy (defaults to "Copy of {original}")'),
  },
  async (args, extra) => {
    try {
      const { userId } = extractAuth(extra);
      const { PersonalFormService } = await import('@/lib/services/personal-form-service');

      const newForm = await PersonalFormService.duplicateForm(
        args.form_id, 'personal', userId
      );

      if (args.new_title) {
        const supabase = await createMcpSupabaseClient(extra.authInfo!.token);
        await PersonalFormService.updatePersonalForm(
          newForm.id, { title: args.new_title }, userId, supabase
        );
        newForm.title = args.new_title;
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ai-forms.jicate.solutions';
      return toolSuccess({
        id: newForm.id,
        title: newForm.title,
        public_url: `${appUrl}/forms/public/${newForm.id}`,
        message: `Form duplicated successfully`,
      });
    } catch (error) {
      return toolError('Failed to duplicate form', error);
    }
  }
);
```

---

### Task 2.12 — `manage_personal_form_collaborators` tool

```typescript
server.tool(
  'manage_personal_form_collaborators',
  'Add, update permissions, or remove collaborators on a personal form. Collaborators can be given granular permissions: edit structure, view responses, export data, manage other collaborators.',
  {
    form_id: z.string().uuid().describe('Form ID'),
    action: z.enum(['add', 'update', 'remove']).describe('Action to perform'),
    user_id: z.string().uuid().describe('Collaborator user ID (use search_users to find)'),
    permissions: z.object({
      can_edit_structure: z.boolean().default(false),
      can_view_responses: z.boolean().default(true),
      can_export_data: z.boolean().default(false),
      can_manage_collaborators: z.boolean().default(false),
    }).optional().describe('Permissions (required for add/update)'),
  },
  async (args, extra) => {
    try {
      const { userId, token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);
      const { PersonalFormService } = await import('@/lib/services/personal-form-service');

      if (args.action === 'add') {
        if (!args.permissions) return toolError('Permissions required for add action');
        const collaborator = await PersonalFormService.addCollaborator(
          {
            personal_form_id: args.form_id,
            user_id: args.user_id,
            ...args.permissions,
          },
          userId,
          supabase
        );
        return toolSuccess({ collaborator, message: 'Collaborator added' });
      }

      if (args.action === 'update') {
        if (!args.permissions) return toolError('Permissions required for update action');
        // Find existing collaborator record
        const existing = await PersonalFormService.getUserCollaboratorRecord(
          args.form_id, args.user_id, supabase
        );
        if (!existing) return toolError('Collaborator not found');
        const updated = await PersonalFormService.updateCollaboratorPermissions(
          existing.id, args.permissions
        );
        return toolSuccess({ collaborator: updated, message: 'Permissions updated' });
      }

      if (args.action === 'remove') {
        const existing = await PersonalFormService.getUserCollaboratorRecord(
          args.form_id, args.user_id, supabase
        );
        if (!existing) return toolError('Collaborator not found');
        await PersonalFormService.removeCollaborator(existing.id, supabase);
        return toolSuccess({ message: 'Collaborator removed' });
      }

      return toolError('Invalid action');
    } catch (error) {
      return toolError('Failed to manage collaborators', error);
    }
  }
);
```

**Phase 2 exit criteria:** All 12 tools registered. Can create → list → update → publish → view responses → get analytics → get AI insights → export → duplicate → manage collaborators — entirely through Claude conversation.

---

## Phase 3: Institutional Forms + Events

### Task 3.1 — `list_forms` (institutional) tool

```typescript
server.tool(
  'list_institutional_forms',
  'List institutional forms with role-based filtering. Super admins see all, coordinators see their institution.',
  {
    institution_id: z.string().uuid().optional().describe('Filter by institution'),
    event_id: z.string().uuid().optional().describe('Filter by event'),
    status: z.enum(['draft', 'published', 'archived']).optional(),
  },
  async (args, extra) => {
    try {
      const { token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);

      let query = supabase.from('forms').select('*');
      if (args.institution_id) query = query.eq('institution_id', args.institution_id);
      if (args.event_id) query = query.eq('event_id', args.event_id);
      if (args.status) query = query.eq('status', args.status);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return toolError('Query failed', error);

      return toolSuccess({ forms: data || [], total: data?.length || 0 });
    } catch (error) {
      return toolError('Failed to list institutional forms', error);
    }
  }
);
```

---

### Task 3.2 — `create_institutional_form` tool

```typescript
server.tool(
  'create_institutional_form',
  'Create an institutional form linked to an institution and optionally an event. Requires institution coordinator role or higher.',
  {
    title: z.string().min(1).describe('Form title'),
    institution_id: z.string().uuid().describe('Institution ID'),
    event_id: z.string().uuid().optional().describe('Link to an event'),
    fields: z.array(z.object({
      type: z.enum(['text', 'number', 'email', 'textarea', 'select', 'checkbox', 'radio', 'date', 'time']),
      label: z.string(),
      required: z.boolean().default(true),
      options: z.array(z.string()).optional(),
    })).min(1).describe('Form fields'),
    is_public: z.boolean().default(true),
    status: z.enum(['draft', 'published']).default('published'),
  },
  async (args, extra) => {
    try {
      const { userId, role, token } = extractAuth(extra);
      if (!hasMinimumRole(role, 'event_coordinator')) {
        return toolError('Requires event_coordinator role or higher');
      }

      const supabase = await createMcpSupabaseClient(token);
      const fields = args.fields.map((f, i) => ({
        id: `field_${Date.now()}_${i}`,
        ...f,
      }));

      const { data, error } = await supabase.from('forms').insert({
        title: args.title,
        institution_id: args.institution_id,
        event_id: args.event_id || null,
        fields,
        is_public: args.is_public,
        status: args.status,
        created_by: userId,
      }).select().single();

      if (error) return toolError('Failed to create form', error);
      return toolSuccess({ ...data, message: `Institutional form "${args.title}" created` });
    } catch (error) {
      return toolError('Failed to create institutional form', error);
    }
  }
);
```

---

### Task 3.3 — `get_institutional_form_responses` tool

```typescript
server.tool(
  'get_institutional_form_responses',
  'Get responses for an institutional form. Access is role-based: super_admin sees all, coordinators see their institution forms.',
  {
    form_id: z.string().uuid().describe('Form ID'),
    limit: z.number().default(50),
    offset: z.number().default(0),
  },
  async (args, extra) => {
    try {
      const { token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);

      const { data, error, count } = await supabase
        .from('form_responses')
        .select('*', { count: 'exact' })
        .eq('form_id', args.form_id)
        .order('created_at', { ascending: false })
        .range(args.offset, args.offset + args.limit - 1);

      if (error) return toolError('Query failed', error);
      return toolSuccess({ responses: data || [], total: count || 0 });
    } catch (error) {
      return toolError('Failed to get responses', error);
    }
  }
);
```

---

### Task 3.4 — `list_events` tool

```typescript
server.tool(
  'list_events',
  'List events with optional filtering by institution, status, or search term.',
  {
    institution_id: z.string().uuid().optional().describe('Filter by institution'),
    search: z.string().optional().describe('Search by event title'),
    limit: z.number().default(20),
  },
  async (args, extra) => {
    try {
      const { token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);

      let query = supabase.from('events').select('*, places(name, location)');
      if (args.institution_id) query = query.eq('institution_id', args.institution_id);
      if (args.search) query = query.ilike('title', `%${args.search}%`);

      const { data, error } = await query
        .order('start_time', { ascending: false })
        .limit(args.limit);

      if (error) return toolError('Query failed', error);
      return toolSuccess({ events: data || [] });
    } catch (error) {
      return toolError('Failed to list events', error);
    }
  }
);
```

---

### Task 3.5 — `create_event` tool

```typescript
server.tool(
  'create_event',
  'Create a new event linked to an institution. Requires institution coordinator role or higher.',
  {
    title: z.string().min(1).describe('Event title'),
    institution_id: z.string().uuid().describe('Institution ID'),
    start_time: z.string().describe('Start time (ISO 8601 format)'),
    end_time: z.string().describe('End time (ISO 8601 format)'),
    department_id: z.string().uuid().optional().describe('Department ID'),
    place_id: z.string().uuid().optional().describe('Venue ID'),
    has_registration_form: z.boolean().default(false).describe('Whether event needs a registration form'),
  },
  async (args, extra) => {
    try {
      const { userId, role, token } = extractAuth(extra);
      if (!hasMinimumRole(role, 'event_coordinator')) {
        return toolError('Requires event_coordinator role or higher');
      }

      const supabase = await createMcpSupabaseClient(token);
      const { data, error } = await supabase.from('events').insert({
        title: args.title,
        institution_id: args.institution_id,
        start_time: args.start_time,
        end_time: args.end_time,
        department_id: args.department_id || null,
        place_id: args.place_id || null,
        has_registration_form: args.has_registration_form,
        coordinator_id: userId,
      }).select().single();

      if (error) return toolError('Failed to create event', error);
      return toolSuccess({ ...data, message: `Event "${args.title}" created` });
    } catch (error) {
      return toolError('Failed to create event', error);
    }
  }
);
```

---

### Task 3.6 — `get_event` tool

```typescript
server.tool(
  'get_event',
  'Get full details of a specific event including venue, coordinators, and linked forms.',
  {
    event_id: z.string().uuid().describe('Event ID'),
  },
  async (args, extra) => {
    try {
      const { token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);

      const { data, error } = await supabase
        .from('events')
        .select('*, places(name, location, capacity), forms(id, title, status), event_coordinators(user_id, role)')
        .eq('id', args.event_id)
        .single();

      if (error) return toolError('Event not found', error);
      return toolSuccess(data);
    } catch (error) {
      return toolError('Failed to get event', error);
    }
  }
);
```

**Phase 3 exit criteria:** All 6 institutional tools work. RBAC correctly scopes data.

---

## Phase 4: Utilities + OAuth

### Task 4.1 — `list_form_templates` tool

```typescript
server.tool(
  'list_form_templates',
  'List available form templates that can be used as starting points for new forms.',
  {
    category: z.string().optional().describe('Filter by category'),
  },
  async (args, extra) => {
    try {
      const { token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);

      let query = supabase.from('form_templates').select('*');
      if (args.category) query = query.eq('category', args.category);

      const { data, error } = await query.order('title');
      if (error) return toolError('Query failed', error);

      return toolSuccess({
        templates: data?.map((t: any) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          field_count: t.fields?.length || 0,
          fields_preview: t.fields?.slice(0, 5).map((f: any) => `${f.label} (${f.type})`),
        })) || [],
      });
    } catch (error) {
      return toolError('Failed to list templates', error);
    }
  }
);
```

---

### Task 4.2 — `search_users` tool

```typescript
server.tool(
  'search_users',
  'Search for users by name or email. Useful for finding collaborators to add to forms.',
  {
    query: z.string().min(1).describe('Search term (name or email)'),
    limit: z.number().default(10).describe('Max results'),
  },
  async (args, extra) => {
    try {
      const { token } = extractAuth(extra);
      const supabase = await createMcpSupabaseClient(token);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, avatar_url')
        .or(`full_name.ilike.%${args.query}%,email.ilike.%${args.query}%`)
        .eq('is_active', true)
        .limit(args.limit);

      if (error) return toolError('Search failed', error);
      return toolSuccess({ users: data || [] });
    } catch (error) {
      return toolError('Failed to search users', error);
    }
  }
);
```

---

### Task 4.3 — OAuth route for Claude.ai connector

**File:** `app/api/mcp/oauth/route.ts`

This route provides a Google OAuth login flow for Claude.ai custom connector integration. The full implementation follows the Intent Interview Platform pattern:

1. **GET** with `action=authorize` — Renders an HTML page with a "Sign in with Google" button
2. The button triggers Supabase Google OAuth which redirects back with tokens
3. Tokens are passed back to Claude.ai's `redirect_uri`

**Note:** This is the most complex task — involves Supabase Auth redirect handling. Full code to be written during implementation based on the app's existing auth callback at `app/auth/callback/route.ts`.

---

### Task 4.4 — Claude Code `.mcp.json`

**File:** `.mcp.json` at project root

```json
{
  "mcpServers": {
    "jkkn-ai-forms": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

For production (Claude.ai connector), the URL would be `https://ai-forms.jicate.solutions/api/mcp` with OAuth configuration.

---

### Task 4.5 — Deploy and verify

1. Push to GitHub → auto-deploy to Vercel
2. Verify: `curl -X POST https://ai-forms.jicate.solutions/api/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`
3. Should list all 20+ tools

**Phase 4 exit criteria:** MCP works locally via Claude Code and remotely via Claude.ai.

---

## Phase 5: Quality & Documentation

### Task 5.1 — Input validation hardening
Review all Zod schemas for edge cases (empty strings, negative numbers, SQL injection in search params).

### Task 5.2 — Error handling audit
Ensure all tools catch errors gracefully and return `toolError()` responses — no unhandled promise rejections.

### Task 5.3 — Security review
Verify RBAC in every tool. Test cross-user access attempts. Ensure no data leakage.

### Task 5.4 — FOROMM.md documentation
Write plain-language documentation explaining the MCP system for the non-coder project owner.

### Task 5.5 — Production verification
Full end-to-end test on production: create form → publish → view responses → analytics → export.

---

## Task Summary

| Phase | Tasks | Tool Count | Priority |
|-------|-------|------------|----------|
| 1. Foundation | 5 tasks | 1 (get_dashboard) | MUST — nothing works without this |
| 2. Personal Forms | 12 tasks | 12 tools | MUST — core value proposition |
| 3. Institutional | 6 tasks | 6 tools | SHOULD — extends to institutional scope |
| 4. OAuth + Deploy | 5 tasks | 2 tools + infra | SHOULD — enables Claude.ai access |
| 5. Quality | 5 tasks | 0 (hardening) | MUST — production readiness |
| **Total** | **33 tasks** | **21 tools** | |

---

*Plan version: 1.0 | Author: Claude (SDD Phase 2+3) | Awaiting human approval before build*
