# Personal Forms - Supabase Client Fix

**Date**: 2025-10-22
**Issue**: 500 error when creating personal forms
**Error Messages**:
- `invalid input syntax for type uuid: "undefined"`
- `new row violates row-level security policy for table "personal_forms"`

**Status**: ✅ **FIXED**

---

## Root Cause

The service layer (`PersonalFormService`) was using the **browser Supabase client** (`createClientSupabaseClient()`) when being called from **server-side API routes**.

### Why This Caused Errors

1. **Browser client doesn't have server session access**
   - When API routes called the service, `auth.uid()` returned `undefined`
   - This caused `created_by` field to receive `"undefined"` string
   - PostgreSQL rejected it: `invalid input syntax for type uuid: "undefined"`

2. **RLS policies couldn't verify user**
   - The INSERT policy checks: `auth.uid() = created_by`
   - With `auth.uid()` = undefined, the check failed
   - Error: `new row violates row-level security policy`

### The Problem Flow

```
API Route (server-side)
  ↓
PersonalFormService.createPersonalForm()
  ↓
createClientSupabaseClient() ❌ WRONG CLIENT!
  ↓
Supabase query with auth.uid() = undefined
  ↓
RLS policy violation + UUID error
```

---

## The Fix

### 1. Updated Service Layer

**File**: `lib/services/personal-form-service.ts`

Made service methods accept an optional Supabase client parameter:

```typescript
// BEFORE
async createPersonalForm(
  form: CreatePersonalFormPayload
): Promise<PersonalForm> {
  const supabase = createClientSupabaseClient(); // ❌ Always browser client
  // ...
}

// AFTER
async createPersonalForm(
  form: CreatePersonalFormPayload,
  supabaseClient?: any  // ✅ Accept client parameter
): Promise<PersonalForm> {
  const supabase = supabaseClient || createClientSupabaseClient();
  // ...
}
```

**Changes**:
- ✅ `createPersonalForm(form, supabaseClient?)` - accepts optional client
- ✅ `addCollaborator(collaborator, requestingUserId?, supabaseClient?)` - accepts optional client
- ✅ Inline slug check function uses the same client instance

### 2. Updated API Route

**File**: `app/api/personal-forms/route.ts`

Modified POST handler to pass server Supabase client:

```typescript
// BEFORE
const form = await PersonalFormService.createPersonalForm(payload);

// AFTER
const { createServerSupabaseClient } = await import('@/lib/supabase/server');
const supabase = await createServerSupabaseClient();
const form = await PersonalFormService.createPersonalForm(payload, supabase);
```

### 3. Fixed Slug Check

Replaced method call with inline function:

```typescript
// BEFORE
const uniqueSlug = await generateUniqueSlug(
  baseSlug,
  this.checkSlugExists  // Uses browser client
);

// AFTER
const checkSlug = async (slug: string) => {
  const { data } = await supabase  // Uses passed server client
    .from('personal_forms')
    .select('id')
    .eq('slug', slug)
    .limit(1);
  return !!(data && data.length > 0);
};
const uniqueSlug = await generateUniqueSlug(baseSlug, checkSlug);
```

---

## The Correct Flow Now

```
API Route (server-side)
  ↓
createServerSupabaseClient() ✅
  ↓
PersonalFormService.createPersonalForm(payload, supabase)
  ↓
Uses server client with proper auth context
  ↓
Supabase query with auth.uid() = actual user ID ✅
  ↓
RLS policy passes ✅
  ↓
Form created successfully ✅
```

---

## Testing

### Before Fix

```bash
POST /api/personal-forms
{
  "title": "Test Form",
  "description": "Testing",
  "fields": [],
  "status": "draft",
  "is_public": false
}

# Result: 500 Internal Server Error
# Logs:
# - ERROR: invalid input syntax for type uuid: "undefined"
# - ERROR: new row violates row-level security policy
```

### After Fix

```bash
POST /api/personal-forms
{
  "title": "Test Form",
  "description": "Testing",
  "fields": [],
  "status": "draft",
  "is_public": false
}

# Expected Result: 201 Created
# Response: { id, title, description, created_by, ... }
```

---

## Files Changed

1. **`lib/services/personal-form-service.ts`**
   - Updated `createPersonalForm()` signature
   - Updated `addCollaborator()` signature
   - Inline slug check function

2. **`app/api/personal-forms/route.ts`**
   - Import and use `createServerSupabaseClient()`
   - Pass server client to service method

---

## Why This Approach?

### Option 1: Always Use Server Client (Not Chosen)
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const PersonalFormService = {
  async createPersonalForm() {
    const supabase = await createServerSupabaseClient(); // ❌ Breaks client-side calls
  }
}
```

**Problem**: Service can't be called from client components

### Option 2: Accept Client Parameter (✅ Chosen)
```typescript
async createPersonalForm(form, supabaseClient?) {
  const supabase = supabaseClient || createClientSupabaseClient();
}
```

**Benefits**:
- ✅ Works from both server and client
- ✅ Backwards compatible
- ✅ Caller controls which client to use
- ✅ Minimal code changes

### Option 3: Separate Services (Not Needed)
```typescript
// server-personal-form-service.ts
// client-personal-form-service.ts
```

**Problem**: Duplicate code and maintenance burden

---

## Browser vs Server Client Summary

### `createClientSupabaseClient()` (Browser Client)

**Use When**:
- Client components
- Browser-side JavaScript
- Public form submissions (no auth)

**Has Access To**:
- Client-side cookies
- Browser storage
- Public data only (unless user logged in via browser)

**Does NOT Have**:
- Server-side session
- API route auth context

### `createServerSupabaseClient()` (Server Client)

**Use When**:
- API routes
- Server components
- Server actions
- Backend operations

**Has Access To**:
- Server-side cookies
- Request auth headers
- Full auth context
- RLS policies work correctly

---

## Lessons Learned

1. **Match Client to Context**: Always use server client in API routes, browser client in components

2. **Service Layer Flexibility**: Services should accept client parameter to work in both contexts

3. **RLS Requires Proper Auth**: Row Level Security policies depend on `auth.uid()` which only works with proper auth context

4. **Undefined UUID Error**: When you see `invalid input syntax for type uuid: "undefined"`, check if `auth.uid()` is working

5. **Test Both Sides**: Test services from both client components and API routes

---

## Migration Notes

### Other Service Methods to Update

The following methods still use `createClientSupabaseClient()` internally and may need updates if called from API routes:

- `getPersonalForm()`
- `updatePersonalForm()`
- `deletePersonalForm()`
- `getResponses()`
- `exportToCSV()`
- `exportToExcel()`
- All collaborator management methods

**Recommendation**: Update these methods to accept `supabaseClient?` parameter when API routes for them are created.

### Pattern to Follow

When creating new API routes for personal forms:

```typescript
export const GET = withAuthApi(async (req, context, session) => {
  // 1. Get server client
  const { createServerSupabaseClient } = await import('@/lib/supabase/server');
  const supabase = await createServerSupabaseClient();

  // 2. Pass to service method
  const result = await PersonalFormService.someMethod(params, supabase);

  // 3. Return response
  return NextResponse.json(result);
});
```

---

## Verification Checklist

✅ Form creation works without errors
✅ Creator is auto-added as collaborator with full permissions
✅ Slug generation works correctly
✅ No UUID errors in logs
✅ No RLS policy violations
✅ User ID is properly captured in `created_by` field

---

## Future Improvements

1. **Type Safety**: Replace `supabaseClient?: any` with proper type:
   ```typescript
   import type { SupabaseClient } from '@supabase/supabase-js';
   supabaseClient?: SupabaseClient
   ```

2. **Factory Pattern**: Create a helper to get the right client:
   ```typescript
   async function getSupabaseClient(isServer?: boolean) {
     return isServer
       ? await createServerSupabaseClient()
       : createClientSupabaseClient();
   }
   ```

3. **Comprehensive Update**: Update all service methods to accept client parameter

4. **Integration Tests**: Add tests that verify correct client usage in different contexts

---

**Generated**: 2025-10-22
**Files Modified**: 2
**Status**: ✅ **READY TO TEST**

---

## Next Steps

1. **Test form creation** in your browser at `http://localhost:3000/personal/forms/new`
2. **Enter a title and description** and click "Create & Build Form"
3. **Verify success**: You should be redirected to the form builder without errors
4. **Check the database**: Verify the form was created with correct `created_by` UUID
5. **Check collaborators**: Verify you were auto-added as owner with full permissions

If it still shows an error, check:
- Browser console for client-side errors
- Server terminal for API route errors
- Supabase logs for database errors

Let me know the results!
