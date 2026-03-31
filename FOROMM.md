# JKKN AI Forms MCP Server -- Explained for Omm

*Written: 2026-03-31*

---

## What Is This MCP Server?

Think of the MCP server as a **translator sitting between you and the forms system**. Right now, if you want to create a feedback form for a pharmacy seminar, you open the website, click through menus, drag fields around, configure settings, and publish. It works, but it is a lot of clicking.

The MCP server changes this. Instead of navigating the web interface, you just tell Claude what you want in plain English:

> "Create a feedback form for the pharmacy seminar with fields for name, a 1-5 rating, and an open comments box."

Claude understands your request, calls the MCP server behind the scenes, and the form is created -- with a public URL ready to share. No menus, no dragging, no configuring. You just say it and it happens.

**MCP stands for Model Context Protocol.** It is a standard that Anthropic (the company behind Claude) created so that AI assistants can talk to external services in a structured way. Think of it like USB for AI -- a universal plug that lets Claude connect to your forms system, your database, your tools, all through one standard interface.

The MCP server does NOT replace the web interface. Both coexist. Some things are faster through conversation (creating forms, checking stats, exporting data). Some things are better in the UI (dragging fields to reorder them, previewing the form's appearance, uploading images). Use whichever fits the moment.

---

## How It Works (The Big Picture)

Here is the flow when you ask Claude to create a form:

```
You (in Claude)          Claude               MCP Server             Supabase Database
      |                    |                      |                        |
      |  "Create a         |                      |                        |
      |   feedback form"   |                      |                        |
      |------------------->|                      |                        |
      |                    |  Calls tool:          |                        |
      |                    |  create_personal_form |                        |
      |                    |--------------------->|                        |
      |                    |                      |  Validates your token  |
      |                    |                      |  (are you logged in?)  |
      |                    |                      |                        |
      |                    |                      |  INSERT INTO           |
      |                    |                      |  personal_forms (...)  |
      |                    |                      |----------------------->|
      |                    |                      |                        |
      |                    |                      |  Form created!         |
      |                    |                      |<-----------------------|
      |                    |                      |                        |
      |                    |  Here's the form:    |                        |
      |                    |  ID, URL, title      |                        |
      |                    |<---------------------|                        |
      |                    |                      |                        |
      |  "Done! Your form  |                      |                        |
      |   is live at       |                      |                        |
      |   ai-forms.../xyz" |                      |                        |
      |<-------------------|                      |                        |
```

**What each piece does:**

| Piece | Role | Analogy |
|-------|------|---------|
| **You** | Tell Claude what you want in plain English | The person ordering food |
| **Claude** | Understands your intent, picks the right tool, formats the request | The waiter who translates your order |
| **MCP Server** | Receives the structured request, checks your identity, runs the operation | The kitchen that prepares the food |
| **Supabase** | Stores all the data -- forms, responses, users, events | The pantry and fridge where ingredients live |

The MCP server is the crucial middle layer. Without it, Claude has no way to reach your forms database. With it, Claude can do almost everything the web interface can do, but through conversation.

---

## What Can You Do With It?

The MCP server exposes **21 tools** organized into five categories. Here is every single one, explained in plain English:

### Dashboard

| Tool | What It Does |
|------|-------------|
| `get_dashboard` | Shows you the big-picture numbers: how many forms you have, how many events exist, total responses received. Like opening the home page of the web app. |

### Personal Forms (Your Forms)

These are forms you create for yourself -- feedback surveys, registration forms, polls. They belong to you, not to an institution.

| Tool | What It Does |
|------|-------------|
| `create_personal_form` | Creates a new form. You tell Claude the title, what fields you want (name, email, rating, comments, etc.), and it builds the form and gives you a shareable link. |
| `list_personal_forms` | Shows all your forms in a list -- title, status (draft/published/archived), how many responses each has received. |
| `get_personal_form` | Gets the full details of one specific form -- all the fields, all the settings, who has access. |
| `update_personal_form` | Changes something about an existing form -- rename it, add a field, change the status from draft to published, set a submission limit. |
| `delete_personal_form` | Permanently deletes a form and all its responses. There is no undo. Claude will confirm before doing this. |
| `get_personal_form_responses` | Shows you all the answers people have submitted. Each response includes the person's data, their email, and when they submitted. |
| `get_personal_form_stats` | Quick numbers about a form -- total submissions, whether the submission limit has been reached, how many more can be accepted. |
| `get_personal_form_analytics` | Deep analytics -- which fields get the most varied answers, what times of day people submit, response trends over weeks, breakdowns of checkbox/radio selections. |
| `get_personal_form_insights` | AI-powered analysis. Claude looks at all your response data and writes 4-6 actionable insights: "Submissions spike on Mondays," "The comments field has low completion -- consider making it optional," etc. |
| `export_personal_form_responses` | Exports all responses as a CSV file (spreadsheet-compatible). You can paste it into Excel or Google Sheets for further analysis. |
| `duplicate_personal_form` | Makes an exact copy of a form -- same fields, same settings -- but with zero responses. Useful when you want a similar form for a different event. |
| `manage_personal_form_collaborators` | Lets you share a form with other people. You can give them granular permissions: view responses only, edit the form structure, export data, or manage other collaborators. |

### Institutional Forms (Organization-Level)

These are forms tied to a JKKN institution -- like official event registration forms or departmental surveys. They have stricter access controls.

| Tool | What It Does |
|------|-------------|
| `list_institutional_forms` | Lists all forms for an institution. Super admins see everything; coordinators see their own institution's forms only. |
| `create_institutional_form` | Creates a form linked to a specific institution and optionally to an event. Only coordinators and above can do this. |
| `get_institutional_form_responses` | Shows responses for an institutional form. Access is controlled by your role -- you can only see what you are authorized to see. |

### Events

| Tool | What It Does |
|------|-------------|
| `list_events` | Lists events, optionally filtered by institution or search term. Shows venue info and dates. |
| `create_event` | Creates a new event with a title, start/end time, institution, and optional venue. Only coordinators and above. |
| `get_event` | Gets full details of one event -- including the venue capacity, which coordinators are assigned, and what registration forms are linked. |

### Utilities

| Tool | What It Does |
|------|-------------|
| `list_form_templates` | Shows pre-built form templates you can use as starting points -- saves time when creating common form types. |
| `search_users` | Finds users by name or email. Useful when you want to add someone as a collaborator but only know their name. |

### Example Conversations

Here is how natural these interactions feel:

**Creating a form:**
> You: "I need a feedback form for the pharmacy workshop happening next week. Should have name, department (dropdown with all JKKN departments), a 1-10 satisfaction rating, and a comments box."
>
> Claude: "Done! Created 'Pharmacy Workshop Feedback' with 4 fields. Here's the link: ai-forms.jicate.solutions/forms/public/abc123. It's published and accepting submissions."

**Checking responses:**
> You: "How many people filled out the pharmacy feedback form?"
>
> Claude: "47 responses so far. Average satisfaction rating is 8.2/10. Most submissions came in on Tuesday between 2-4 PM. Want me to show you the full analytics or export the data?"

**Managing access:**
> You: "Add Dr. Kumar to the pharmacy feedback form so he can view responses."
>
> Claude: "Added Dr. Kumar with view-responses permission. He can now see submissions but cannot edit the form structure or export data. Want me to give him additional permissions?"

### What's NOT Possible via MCP

Some things stay in the web interface because they need a browser:

| Feature | Why It's Web-Only |
|---------|------------------|
| **Payments** | Razorpay requires a browser redirect for secure payment processing |
| **File uploads** | Uploading images, signatures, or documents needs a file picker |
| **Visual form preview** | Seeing exactly how the form looks to respondents needs rendering |
| **Drag-and-drop reordering** | Moving fields around is inherently visual |
| **Real-time notifications** | Push notifications happen through the web app's socket connection |

---

## How Authentication Keeps It Secure

Security was a first-class concern. Here is how the system makes sure nobody can access data they should not see.

**Layer 1: Identity verification.** Every MCP request includes your Supabase token (the same token the web app uses when you log in with Google). The MCP server validates this token against Supabase Auth before doing anything. No valid token = no access.

**Layer 2: Role-based access control (RBAC).** Your profile has a role: super_admin, administrator, institution_coordinator, event_coordinator, staff, student, or public. Each tool checks whether your role is high enough. A student cannot create institutional forms. A staff member cannot delete someone else's form.

**Layer 3: Row-Level Security (RLS).** Even if a tool runs a database query, Supabase itself enforces that you can only see data you own or have been granted access to. The MCP server creates a database connection using YOUR token, so Supabase treats it exactly like you logged in through the web -- same permissions, same restrictions.

**Layer 4: Rate limiting.** The server limits each IP address to 60 requests per minute. If someone tries to flood the endpoint, they get a "429 Too Many Requests" response until the window resets. This prevents abuse and keeps the server responsive for everyone.

In short: you have the same security through MCP as through the web interface. The MCP server does not create any backdoors or shortcuts around the existing permission system.

---

## Technologies Used (And Why)

### Why mcp-handler?

This is Vercel's official adapter for running MCP servers inside Next.js API routes. We chose it because:

- It handles the MCP protocol negotiation automatically (connection setup, tool discovery, streaming responses)
- It integrates natively with Vercel's serverless infrastructure (where the app is deployed)
- It provides the `withMcpAuth` wrapper that plugs into our existing Supabase auth
- The Intent Interview Platform (another JKKN project) already proved this library works in production

The alternative would have been running a standalone MCP server on a separate machine. That means more infrastructure, more deployment complexity, more things to maintain. With mcp-handler, the MCP server is just another API route in the existing app -- same deployment, same domain, same monitoring.

### Why Thin Wrappers Over Existing Services?

The MCP tools do NOT contain any business logic. Each tool is a thin wrapper that:

1. Validates inputs using Zod schemas
2. Checks authentication and authorization
3. Calls an existing service function (the same ones the web UI uses)
4. Formats the response

This means there is exactly ONE place where "create a form" logic lives -- in `PersonalFormService`. The MCP tool, the web API route, and the web UI all call the same service. If we fix a bug in the service, it is fixed everywhere. If we had duplicated logic in the MCP layer, we would have two places to maintain and two places bugs could hide.

### Why Supabase JWT Auth?

Because it is what the app already uses. When you log in with Google on the web interface, Supabase gives you a JWT token. The MCP server accepts that exact same token. No new auth system, no new passwords, no new accounts. You are already logged in through Google = you can use MCP.

---

## How to Connect

### From Claude Code (Local Development)

The project includes a `.mcp.json` file at the root:

```json
{
  "mcpServers": {
    "jkkn-ai-forms": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

When you open the project in Claude Code, it automatically discovers this configuration and connects to the MCP server. You need the dev server running (`npm run dev`) for it to work.

For the production server, the URL would be `https://ai-forms.jicate.solutions/api/mcp`.

### From Claude.ai (OAuth Connector)

This is planned for Phase 4. When ready, it will work like this:

1. In Claude.ai settings, you add the JKKN AI Forms connector
2. First time you use it, Claude.ai redirects you to a Google login page
3. You log in with your JKKN Google account (same as the web app)
4. Claude.ai receives your token and stores it
5. From then on, you can just talk to Claude about forms naturally

---

## The Architecture at a Glance

```
Project Root
  |
  +-- app/api/mcp/
  |     +-- route.ts          <-- The MCP endpoint (GET/POST/DELETE)
  |                                Handles rate limiting, delegates to MCP handler
  |
  +-- lib/mcp/
        +-- tools.ts          <-- All 21 tool definitions
        |                         Each tool: name, description, Zod schema, handler function
        +-- auth.ts           <-- Token verification and role checking
        |                         verifyToken(), extractAuth(), hasMinimumRole()
        +-- helpers.ts        <-- Response formatters
                                  toolSuccess(), toolError(), createMcpSupabaseClient()
```

Four files. That is the entire MCP server. The rest of the work is done by the existing service layer (15+ services) and Supabase (15+ tables with RLS policies).

---

## Lessons Learned

### The Browser-Client vs. Server-Client Gotcha

This was the trickiest part of the build. The existing services (FormService, EventService, DashboardService) were designed for the web browser. They create a Supabase client using `createClientSupabaseClient()`, which relies on browser cookies for authentication.

MCP tools run on the server. There are no cookies. There is no browser. So we could not use those browser clients.

The solution: `PersonalFormService` already accepted an optional `supabaseClient` parameter (forward-thinking design). For tools that call this service, we create a server-side Supabase client using the user's bearer token and pass it in. For tools that talk to other services (like institutional forms and events), we query Supabase directly using the same token-authenticated client.

The lesson: when building services, always accept an optional client parameter. It costs nothing when you do not need it, but saves you when the service needs to run in a new context.

### The AnalyticsContext Type Puzzle

The `get_personal_form_insights` tool was the hardest to implement. It calls `AIInsightsService.generateInsights()`, which expects a very specific `AnalyticsContext` object. This object has fields like `responseVelocity`, `peakSubmissionDay`, `responsesByDayOfWeek` -- data that comes from the analytics service.

The catch: the analytics service returns an "overview" object, but its shape did not exactly match what `AnalyticsContext` expected. We had to manually construct the context object, mapping fields from the overview to the right property names and adding computed fields like `submissionStatus` (which checks whether the form's submission limit has been reached).

The lesson: when two services need to talk through a shared type, define that type explicitly and test the mapping. Do not assume the shapes will "just match."

### The 4-Argument server.tool() Pattern

MCP tools are registered using `server.tool()` with exactly four arguments:

1. **Tool name** -- a machine-readable identifier (like `create_personal_form`)
2. **Description** -- a human-readable explanation that Claude uses to decide when to call this tool
3. **Input schema** -- a Zod schema defining what parameters the tool accepts
4. **Handler function** -- the async function that runs when the tool is called

Getting the description right matters more than you would think. Claude uses these descriptions to decide which tool to call. A vague description like "manage forms" would confuse Claude. A specific one like "Create a new personal form with specified fields. Each field needs a type (text, number, email...) and a label" tells Claude exactly when this tool is appropriate.

### Rate Limiting on Serverless

The rate limiter uses an in-memory Map, which works great on a traditional server but has a nuance on Vercel's serverless platform: each serverless function invocation might get a fresh instance with an empty Map. This means the rate limiter is "best effort" rather than bulletproof.

That is acceptable because the rate limiter is the fourth layer of defense, not the first. The real security comes from Supabase token validation (Layer 1), role-based access control (Layer 2), and Row-Level Security (Layer 3). The rate limiter is there to prevent accidental flooding, not to be the primary security gate.

If we ever need strict rate limiting, we would add a Redis-backed solution -- but for a system used by JKKN staff (not the general public), the in-memory approach is perfectly adequate.

---

## How Engineers Think About This

For anyone curious about the engineering mindset behind this project:

**Thin interfaces, thick services.** The MCP layer is deliberately thin. It validates inputs and formats outputs, but it does not decide how to create a form or calculate analytics. That logic lives in the service layer, which is shared with the web UI. This is the same principle behind REST APIs: the HTTP endpoint is a thin shell around business logic that could be called from anywhere.

**Auth at the boundary, trust inside.** We verify the user's identity at the MCP endpoint (the boundary). Once verified, we pass the authenticated Supabase client to services, and Supabase's RLS handles the rest. We do not re-check permissions at every service call -- that would be redundant and slow. Trust is established at the door, then carried through via the token-scoped client.

**Progressive enhancement.** The MCP server was added without changing a single line of existing code. No database migrations, no service modifications, no UI changes. It is a new interface layered on top of existing functionality. If the MCP server disappeared tomorrow, the web app would work exactly the same.

**Zod as documentation.** Every tool's input schema is written in Zod, which serves triple duty: runtime validation (rejects bad input), TypeScript type inference (catches errors at compile time), and documentation (Claude reads the schema descriptions to understand what each parameter does). One definition, three purposes.

---

## Quick Reference Card

| Question | Answer |
|----------|--------|
| Where is the MCP endpoint? | `POST /api/mcp` |
| How many tools? | 21 |
| What auth does it use? | Supabase JWT (same Google login as the web app) |
| Can it create forms? | Yes -- personal and institutional |
| Can it process payments? | No -- that requires a browser |
| Can it upload files? | No -- that requires a file picker |
| Rate limit? | 60 requests per minute per IP |
| Total new files added? | 4 (route.ts, tools.ts, auth.ts, helpers.ts) |
| Existing files modified? | 0 |
| Database changes? | 0 |

---

*This document explains the MCP server for the JKKN AI Forms project. It was written as a learning resource for the project owner, who is not a coder but wants to understand how the system works.*
