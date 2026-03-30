# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**JKKN Event Form Management System** - A full-stack institutional event management platform with dynamic form building, role-based access control, payment processing, and multi-institutional support.

**Tech Stack:**
- Next.js 15.1.7 (App Router)
- React 18 + TypeScript 5
- Supabase (PostgreSQL + Auth)
- TanStack React Query (server state)
- React Hook Form + Zod (validation)
- Tailwind CSS + Radix UI
- Razorpay (payments)
- Resend (emails)

## Development Commands

```bash
# Development
npm run dev                    # Start dev server (localhost:3000)
npm run build                  # Production build
npm start                      # Start production server
npm run lint                   # Run ESLint

# Database Scripts
npm run apply-delete-policy    # Apply delete responses policy (ts-node)

# Supabase CLI (requires supabase CLI installed)
supabase start                 # Start local Supabase
supabase db reset              # Reset local database
supabase migration new <name>  # Create new migration
supabase db push               # Push migrations to remote
```

## Environment Setup

Required environment variables (see `.env.example`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Resend (Email)
RESEND_API_KEY=
EMAIL_FROM=

# App
NEXT_PUBLIC_APP_URL=
OPENAI_API_KEY=           # Optional for AI features
```

## Architecture Overview

### Core Concept: Multi-Role Event & Form Management

The application manages **events** across multiple **institutions** and **departments**, with dynamic **forms** for event registration/feedback and **responses** tracked per submission. A sophisticated **7-tier role hierarchy** controls access.

### Database Schema (10 Core Tables)

```
profiles (3,308 users)
  ├─→ institutions (9)
  │     ├─→ departments (7)
  │     │     └─→ events (17)
  │     │           └─→ forms (27)
  │     │                 └─→ form_responses (5,711)
  │     └─→ institution_coordinators (junction)
  └─→ department_coordinators (junction)

Additional: places (6), form_templates (2)
```

**Key Relationships:**
- Events belong to `institution`, `department`, `place` (venue), and have a `coordinator` (user)
- Forms belong to `institution`, optionally to `event`, and have `fields` (JSONB) with conditional logic
- Form responses have `response_data` (JSONB), `submission_id` (SUB-XXX-NNNNNN format), and payment tracking

### Role-Based Access Control (RBAC)

**Role Hierarchy (highest to lowest):**
1. `super_admin` - Full system access
2. `administrator` - System admin, institution management
3. `institution_coordinator` - Specific institution management
4. `event_coordinator` - Event and form management
5. `staff` - Event operations support
6. `student` - View events, fill forms
7. `public` - Public form access only

**Authorization Layers:**
1. **Middleware** (`middleware.ts`) - Route-level protection with session validation
2. **Service Layer** - Role-based data filtering in services (e.g., `FormService.getFormResponses()`)
3. **Database RLS** - Row-level security policies on all tables

### Critical Business Logic

#### 1. Form Submission with Payments

**Workflow:**
```typescript
// lib/services/form-service.ts: submitResponse()

1. Generate unique submission_id: SUB-{FORM_PREFIX}-{6-digit-sequential}
   - FORM_PREFIX: First 3 letters of form title
   - Sequential number from existing count

2. Check submission_limit via RPC: can_accept_submission()

3. Calculate payment_amount from payment-type fields

4. Call RPC: create_form_response() with atomic insert
   - Handles duplicate submission_id with retry + timestamp fallback

5. Send email via /api/email (async, non-blocking)

6. If payment required:
   - Redirect to /payment page
   - Create Razorpay order
   - Handle webhook at /api/webhooks/razorpay
   - Verify HMAC-SHA256 signature
   - Update payment_status to 'completed'
```

**Key Files:**
- `lib/services/form-service.ts:472-646` - Submission logic
- `app/api/webhooks/razorpay/route.ts` - Payment webhook
- Supabase RPC: `create_form_response()`

#### 2. Event Status Auto-Update

Events have status: `upcoming | ongoing | completed` based on current time vs. `start_time`/`end_time`.

**Implementation:**
```typescript
// lib/services/organization/event-service.ts

EventService.getEventStatus(start_time, end_time):
  - now < start_time → 'upcoming'
  - start_time ≤ now ≤ end_time → 'ongoing'
  - now > end_time → 'completed'

// Called automatically in:
- EventService.getEvents() - batch update all events
- EventService.getEvent(id) - update single event

// Uses admin client for status updates (bypasses RLS)
```

#### 3. Large Dataset Pagination (>1000 responses)

Forms with many responses use paginated fetching with retry logic:

```typescript
// lib/services/form-service.ts: getFormResponses()

const PAGE_SIZE = 1000;
const MAX_RETRIES = 3;

// Fetch total count first
// Then paginate in chunks with exponential backoff
for (let page = 0; page < totalPages; page++) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Retry with exponential backoff (500ms base)
  // Continue on failure instead of breaking entire operation
}
```

**Applied in:** Form response viewing, CSV/Excel export

#### 4. Dynamic Form Builder with Conditional Logic

Forms support 15+ field types with conditional show/hide logic:

```typescript
// types/forms.ts

interface ConditionalRule {
  source_field_id: string;
  state: 'is_empty' | 'is_filled' | 'equals' | 'contains' | ...;
  comparison_value?: any;
  action: 'show' | 'hide' | 'show_multiple' | 'hide_multiple';
  target_field_ids: string[];
}

// Evaluated client-side in FormFieldRenderer component
```

**Form Storage:** `forms.fields` (JSONB array) contains field definitions + conditional rules

### Supabase Client Architecture

**Three Client Types:**

1. **Browser Client** (`lib/supabase/client.ts`) - Singleton for client components
2. **Server Client** (`lib/supabase/server.ts`) - Cookie-based auth for server components/API
3. **Admin Client** (`lib/supabase/admin.ts`) - Service role for privileged operations

**Server-Compat Pattern:**
```typescript
// lib/supabase/server-compat.ts

export const withAdminClient = async (
  operation: (client: SupabaseClient) => Promise<T>,
  fallbackClient?: SupabaseClient
) => {
  try {
    return await operation(createAdminClient());
  } catch (error) {
    if (fallbackClient) {
      return await operation(fallbackClient);
    }
    throw error;
  }
};
```

**When to use Admin Client:**
- Event status updates (bypass RLS)
- User role updates
- Cross-institution operations for super_admin

### State Management Strategy

**Multi-Layer Approach:**

1. **Server State** (TanStack React Query)
   - Forms, events, responses, users
   - Config: `staleTime: 60s`, `retry: 1`

2. **Client State** (Zustand)
   - UI state (sidebar toggle)
   - Form builder state

3. **Context** (React Context)
   - AuthProvider - User session
   - ThemeProvider - Dark/light mode

4. **Form State** (React Hook Form + Zod)
   - All forms use this pattern
   - See `.cursor/rules/form.mdc` for patterns

### Key Service Patterns

**Service Layer Structure:**
```typescript
// lib/services/[entity]-service.ts

export class EntityService {
  private static supabase = createClientSupabaseClient();

  // CRUD operations with role-based filtering
  static async getEntities(filters: Filters): Promise<Response> {
    // 1. Get current user
    // 2. Check role
    // 3. Apply role-based filters to query
    // 4. Return filtered data
  }

  // Use admin client when needed
  static async updateWithAdmin(id, data) {
    return await withAdminClient(async (client) => {
      return await client.from('entities').update(data).eq('id', id);
    });
  }
}
```

**Critical Services:**
- `lib/services/form-service.ts` (2730 lines) - Form CRUD, submissions, exports, templates
- `lib/services/organization/event-service.ts` - Event management with status logic
- `lib/auth/auth-service.ts` - Session management, OAuth, profile operations

### Routing & Middleware

**Route Structure:**
```
/                           → Dashboard (role-based redirect via middleware)
/(public)/                  → Public pages (home, about, pricing, etc.)
/(routes)/organizations/    → Protected: events, forms, institutions (CRUD)
/forms/public/[formId]      → Public form submission (no auth if published)
/auth/                      → Login, callback, logout
/api/                       → API routes (email, webhooks, users, events)
```

**Middleware Flow** (`middleware.ts`):
```
1. Extract session from cookies
2. Check if public form route → Allow
3. Check if public page → Allow (redirect authenticated users to dashboard)
4. Check if protected route:
   - No session → Redirect /auth/login
   - Get user role from profiles table
   - Check PROTECTED_ROUTES mapping
   - Verify role permissions
   - Institution-specific access control
   - If unauthorized → Redirect /unauthorized
```

### Form Conditional Logic Rendering

Forms can have complex conditional field visibility:

**Implementation:**
```typescript
// components/form/form-field-renderer.tsx

// Evaluate conditions in real-time
const shouldShowField = (field: FormField, formData: Record<string, any>) => {
  const rules = field.conditionalRules || [];

  for (const rule of rules) {
    const sourceValue = formData[rule.source_field_id];

    // Evaluate condition
    const conditionMet = evaluateCondition(
      sourceValue,
      rule.state,
      rule.comparison_value
    );

    // Apply action
    if (conditionMet && rule.action === 'show') return true;
    if (conditionMet && rule.action === 'hide') return false;
  }

  return true; // Default to showing
};
```

### Email Notifications

**Setup:**
- Uses Resend API for transactional emails
- Templates in `components/emails/` with `@react-email/components`
- Triggered by: form submissions, payment confirmations

**Flow:**
```typescript
// After form submission
await fetch('/api/email', {
  method: 'POST',
  body: JSON.stringify({
    formTitle,
    submissionId,
    userEmail,
    paymentStatus,
    paymentAmount
  })
});

// app/api/email/route.ts handles sending
```

### Payment Integration (Razorpay)

**Flow:**
1. User submits form with payment fields
2. Calculate `totalAmount` from payment-type fields
3. Set `payment_status: 'pending'`
4. Redirect to payment page
5. Load Razorpay SDK via `lib/utils/load-razorpay.ts`
6. Create order, show checkout modal
7. Razorpay webhook → `/api/webhooks/razorpay`
8. Verify signature (HMAC-SHA256)
9. Update `payment_status: 'completed'`

**Security:**
```typescript
// Webhook signature verification
const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (signature !== expectedSignature) {
  throw new Error('Invalid signature');
}
```

## Important Implementation Notes

### When Adding New Features

1. **Forms/Responses:**
   - Always check `submission_limit` before allowing submissions
   - Use RPC `create_form_response()` for atomic inserts
   - Handle >1000 responses with pagination
   - Payment fields require `payment_amount` calculation

2. **Events:**
   - Status auto-updates on fetch, use admin client for updates
   - Check place availability with `EventService.checkPlaceAvailability()`
   - Coordinator defaults to institution's coordinator or creator

3. **Role Authorization:**
   - Add route to `PROTECTED_ROUTES` in `middleware.ts`
   - Implement role checks in service layer
   - Test with different roles (especially institution_coordinator, event_coordinator)

4. **Database Changes:**
   - Create migration: `supabase migration new <name>`
   - Always enable RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
   - Add policies for each role
   - Update `types/supabase.ts` (regenerate with `supabase gen types`)

### Common Patterns to Follow

**Service Method:**
```typescript
static async getEntities(filters?: Filters) {
  try {
    const supabase = this.supabase;

    // Build query with filters
    let query = supabase.from('entities').select('*', { count: 'exact' });

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return { data: data || [], total: count || 0 };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

**Component with Data Fetching:**
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/lib/services/entity-service';

export function EntityList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['entities', filters],
    queryFn: () => EntityService.getEntities(filters),
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <DataTable data={data} />;
}
```

**Form with Validation:**
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

type FormData = z.infer<typeof schema>;

export function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  });

  const onSubmit = (data: FormData) => {
    // Handle submission
  };

  return <Form {...form}>...</Form>;
}
```

### File Locations Quick Reference

**Authentication:**
- Session: `lib/auth/auth-service.ts`
- Middleware: `middleware.ts`
- Providers: `providers/auth-provider.tsx`

**Forms:**
- Service: `lib/services/form-service.ts`
- Builder UI: `app/(routes)/organizations/forms/builder/`
- Public submission: `app/forms/public/[formId]/`
- Field renderer: `components/form/form-field-renderer.tsx`

**Events:**
- Service: `lib/services/organization/event-service.ts`
- CRUD pages: `app/(routes)/organizations/events/`
- Status logic: `EventService.getEventStatus()`

**Payments:**
- Webhook: `app/api/webhooks/razorpay/route.ts`
- SDK loader: `lib/utils/load-razorpay.ts`

**Database:**
- Migrations: `supabase/migrations/`
- Type definitions: `types/supabase.ts` (auto-generated)
- RPC functions: Defined in migrations

**Email:**
- API route: `app/api/email/route.ts`
- Templates: `components/emails/`

### Testing Considerations

When testing role-based features:
1. Test with each role level (especially middle tiers)
2. Verify institution_coordinator can only access their institution
3. Verify event_coordinator can only access their events
4. Test department_coordinator access for events in their department

When testing forms:
1. Test with/without payment fields
2. Test submission limits (at limit, over limit)
3. Test conditional logic with various field states
4. Test with >1000 responses (pagination)
5. Test slug-based and UUID-based routing

When testing payments:
1. Use Razorpay test credentials
2. Test webhook signature verification
3. Test payment status transitions
4. Verify email notifications

### Performance Optimization Hints

- Forms with >1000 responses automatically use pagination
- Event status updates use admin client to bypass RLS overhead
- React Query caching reduces redundant fetches (60s stale time)
- Image optimization via next/image with Supabase CDN domains
- Server components used where possible to reduce client JS

### Deployment Notes

- Uses Next.js 15 App Router (requires Node.js 18.18+)
- Build command: `npm run build`
- Environment variables must be set for Supabase, Razorpay, Resend
- Supabase migrations should be applied before deployment
- Webhook endpoint `/api/webhooks/razorpay` must be configured in Razorpay dashboard

## Code Style Conventions (from .cursor/rules)

- TypeScript strict mode enabled
- PascalCase for components/types, camelCase for variables/functions
- Max 300 lines per file when possible
- Use 'use client' directive for client components
- Server components by default (no directive needed)
- Implement proper error boundaries
- Use semantic HTML and ARIA attributes
- Support dark mode with proper contrast
- React 19 features: use Actions API for forms where appropriate
- Shadcn components as first choice for UI elements
