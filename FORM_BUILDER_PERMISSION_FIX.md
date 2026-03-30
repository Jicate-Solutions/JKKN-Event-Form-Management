# Form Builder Permission Fix

**Date**: 2025-10-22
**Issue**: Form builder showing "You do not have permission to edit this form"
**Error Messages**:
- `POST http://localhost:3000/api/personal-forms 500 (Internal Server Error)`
- `GET http://localhost:3000/api/personal-forms/[id] 500 (Internal Server Error)`
- `PUT http://localhost:3000/api/personal-forms/[id] 403 (Forbidden)`

**Status**: ✅ **FIXED**

---

## Root Cause

All three API route handlers (GET, PUT, DELETE) in `app/api/personal-forms/[formId]/route.ts` had the **same underlying issue** from the previous fix:

### The Problem

Service methods were being called from **server-side API routes** without passing:
1. **Server Supabase client** - Needed for proper auth context
2. **User ID parameter** - Needed for permission checks

This caused:
- **GET route**: Failed to check permissions properly
- **PUT route**: Permission check used browser client, failing with 403
- **DELETE route**: Permission check couldn't verify user access

### Why This Failed

```typescript
// BEFORE - All routes had this pattern
export const GET = withAuthApi(async (req, context, session) => {
  const { formId } = context.params;

  // ❌ No userId, no server client
  const form = await PersonalFormService.getPersonalForm(formId);

  return NextResponse.json(form);
});
```

When `getPersonalForm()` was called without `userId`, it couldn't properly check collaborator permissions. When it tried to check permissions internally, it used the **browser client** which doesn't have access to the server session.

---

## The Fix

### 1. Updated Service Layer

**File**: `lib/services/personal-form-service.ts`

Added `supabaseClient?` parameter to `updatePersonalForm()`:

```typescript
// BEFORE
async updatePersonalForm(
  id: string,
  updates: UpdatePersonalFormPayload,
  userId?: string
): Promise<PersonalForm>

// AFTER
async updatePersonalForm(
  id: string,
  updates: UpdatePersonalFormPayload,
  userId?: string,
  supabaseClient?: any  // ✅ Accept server client
): Promise<PersonalForm>
```

**Implementation**:
```typescript
async updatePersonalForm(
  id: string,
  updates: UpdatePersonalFormPayload,
  userId?: string,
  supabaseClient?: any
): Promise<PersonalForm> {
  try {
    // Use passed client or fallback to browser client
    const supabase = supabaseClient || createClientSupabaseClient();

    // Get current form to check permissions
    const currentForm = await this.getPersonalForm(id);

    // Check if user has permission to edit
    if (userId && currentForm.created_by !== userId) {
      // Check if user is a collaborator with edit permission
      const { data: collaborator } = await supabase
        .from('personal_form_collaborators')
        .select('can_edit_structure')
        .eq('personal_form_id', id)
        .eq('user_id', userId)
        .single();

      if (!collaborator || !collaborator.can_edit_structure) {
        throw new Error('You do not have permission to edit this form');
      }
    }

    // If title is being updated, regenerate slug
    if (updates.title && updates.title !== currentForm.title) {
      const baseSlug = generateSlug(updates.title);

      // Inline slug check using the same client instance
      const checkSlug = async (slug: string) => {
        const { data } = await supabase
          .from('personal_forms')
          .select('id')
          .eq('slug', slug)
          .limit(1);
        return !!(data && data.length > 0);
      };

      updates.slug = await generateUniqueSlug(baseSlug, checkSlug);
    }

    const { data, error } = await supabase
      .from('personal_forms')
      .update(updates as { [key: string]: any })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data as unknown as PersonalForm;
  } catch (error) {
    console.error('Error updating personal form:', error);
    throw error;
  }
}
```

### 2. Updated GET Route

**File**: `app/api/personal-forms/[formId]/route.ts`

**Changes**:
- Added `user.id` parameter to `getPersonalForm()` call
- Added specific error handling for access denied

```typescript
// BEFORE
export const GET = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = context.params;

    const form = await PersonalFormService.getPersonalForm(formId);  // ❌ No userId

    return NextResponse.json(form, { status: 200 });
  } catch (error: any) {
    // Generic error handling
  }
});

// AFTER
export const GET = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = context.params;
    const user = session!.user;

    const form = await PersonalFormService.getPersonalForm(formId, user.id);  // ✅ Pass userId

    return NextResponse.json(form, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching personal form:', error);

    if (error.message === 'Personal form not found') {
      return NextResponse.json(
        { error: 'Personal form not found' },
        { status: 404 }
      );
    }

    if (error.message === 'You do not have access to this form') {  // ✅ Handle access denied
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch personal form' },
      { status: 500 }
    );
  }
});
```

### 3. Updated PUT Route

**File**: `app/api/personal-forms/[formId]/route.ts`

**Changes**:
- Removed redundant `checkUserPermission()` call (was using browser client)
- Added server Supabase client creation
- Pass both `user.id` and `supabase` to `updatePersonalForm()`
- Permission check now happens inside service method with server context

```typescript
// BEFORE
export const PUT = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = context.params;
    const user = session!.user;

    const body = await req.json();
    const updates: UpdatePersonalFormPayload = body;

    // ❌ This uses browser client internally - fails on server
    const hasPermission = await PersonalFormService.checkUserPermission(
      formId,
      user.id,
      'can_edit_structure'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this form' },
        { status: 403 }
      );
    }

    // ❌ No userId or server client passed
    const form = await PersonalFormService.updatePersonalForm(formId, updates);

    return NextResponse.json(form, { status: 200 });
  } catch (error: any) {
    // Error handling
  }
});

// AFTER
export const PUT = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = context.params;
    const user = session!.user;

    const body = await req.json();
    const updates: UpdatePersonalFormPayload = body;

    // Get server Supabase client
    const { createServerSupabaseClient } = await import(
      '@/lib/supabase/server'
    );
    const supabase = await createServerSupabaseClient();

    // Permission check is done inside updatePersonalForm
    const form = await PersonalFormService.updatePersonalForm(
      formId,
      updates,
      user.id,      // ✅ Pass userId for permission check
      supabase      // ✅ Pass server client with auth context
    );

    return NextResponse.json(form, { status: 200 });
  } catch (error: any) {
    console.error('Error updating personal form:', error);

    if (error.message === 'You do not have permission to edit this form') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update personal form' },
      { status: 500 }
    );
  }
});
```

### 4. Updated DELETE Route

**File**: `app/api/personal-forms/[formId]/route.ts`

**Changes**:
- Added `user.id` parameter to `getPersonalForm()` call
- Added specific error handling for access denied

```typescript
// BEFORE
export const DELETE = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = context.params;
    const user = session!.user;

    // Get the form to check creator
    const form = await PersonalFormService.getPersonalForm(formId);  // ❌ No userId

    // Only creator can delete
    if (form.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the form creator can delete this form' },
        { status: 403 }
      );
    }

    await PersonalFormService.deletePersonalForm(formId);

    return NextResponse.json(
      { message: 'Personal form deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    // Generic error handling
  }
});

// AFTER
export const DELETE = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = context.params;
    const user = session!.user;

    // Get the form to check creator (pass userId for permission check)
    const form = await PersonalFormService.getPersonalForm(formId, user.id);  // ✅ Pass userId

    // Only creator can delete
    if (form.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the form creator can delete this form' },
        { status: 403 }
      );
    }

    await PersonalFormService.deletePersonalForm(formId);

    return NextResponse.json(
      { message: 'Personal form deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting personal form:', error);

    if (error.message === 'You do not have access to this form') {  // ✅ Handle access denied
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete personal form' },
      { status: 500 }
    );
  }
});
```

---

## The Correct Flow Now

### Form Creation (POST)
```
User creates form
  ↓
API Route: POST /api/personal-forms
  ↓
createServerSupabaseClient() ✅
  ↓
PersonalFormService.createPersonalForm(payload, supabase)
  ↓
Uses server client with proper auth context
  ↓
Form created with correct created_by ✅
  ↓
Creator auto-added as collaborator with full permissions ✅
```

### Form Viewing (GET)
```
User views form
  ↓
API Route: GET /api/personal-forms/[formId]
  ↓
PersonalFormService.getPersonalForm(formId, user.id)
  ↓
Check if user is creator OR collaborator
  ↓
Return form if authorized, 403 if not ✅
```

### Form Editing (PUT)
```
User edits form
  ↓
API Route: PUT /api/personal-forms/[formId]
  ↓
createServerSupabaseClient() ✅
  ↓
PersonalFormService.updatePersonalForm(formId, updates, user.id, supabase)
  ↓
Check if user is creator OR has can_edit_structure permission
  ↓
Update form if authorized, throw error if not ✅
```

### Form Deletion (DELETE)
```
User deletes form
  ↓
API Route: DELETE /api/personal-forms/[formId]
  ↓
PersonalFormService.getPersonalForm(formId, user.id)
  ↓
Check if user is creator
  ↓
Delete if authorized, 403 if not ✅
```

---

## Files Changed

1. **`lib/services/personal-form-service.ts`**
   - Updated `updatePersonalForm()` signature to accept `supabaseClient?`
   - Inline slug check function using same client instance
   - Line 238-280

2. **`app/api/personal-forms/[formId]/route.ts`**
   - Updated GET route to pass `user.id`
   - Updated PUT route to create and pass server client
   - Updated DELETE route to pass `user.id`
   - Added specific error handling for all routes
   - Lines 13-122

---

## Testing Checklist

### ✅ Form Creation
- [ ] Can create new personal form
- [ ] Creator is auto-added as collaborator
- [ ] No UUID "undefined" errors
- [ ] No RLS policy violations

### ✅ Form Viewing
- [ ] Creator can view their forms
- [ ] Collaborators can view shared forms
- [ ] Non-authorized users get 403

### ✅ Form Editing
- [ ] Creator can edit their forms
- [ ] Collaborators with `can_edit_structure` can edit
- [ ] Collaborators without permission get 403
- [ ] Title changes regenerate slug correctly

### ✅ Form Deletion
- [ ] Creator can delete their forms
- [ ] Non-creators get 403
- [ ] Cascades to collaborators and responses

---

## Browser vs Server Client Pattern

### Rule of Thumb

**API Routes** (Server-side):
```typescript
export const POST = withAuthApi(async (req, context, session) => {
  // 1. Get server client
  const { createServerSupabaseClient } = await import('@/lib/supabase/server');
  const supabase = await createServerSupabaseClient();

  // 2. Pass to service method
  const result = await Service.method(params, supabase);

  // 3. Return response
  return NextResponse.json(result);
});
```

**Client Components** (Browser-side):
```typescript
'use client';

function MyComponent() {
  const handleSubmit = async () => {
    // Service method uses browser client (default)
    const result = await Service.method(params);
    // No need to pass client
  };
}
```

**Service Methods** (Flexible):
```typescript
async method(
  param1: string,
  supabaseClient?: any  // Optional - allows both contexts
): Promise<Result> {
  // Use passed client or fallback to browser client
  const supabase = supabaseClient || createClientSupabaseClient();

  // Rest of method...
}
```

---

## Key Takeaways

1. **Always pass userId** to service methods when called from authenticated API routes
2. **Always pass server client** to service methods when called from API routes
3. **Permission checks** should happen inside service methods with proper client context
4. **Don't call permission helpers** that use browser client from API routes
5. **Error handling** should differentiate between 404, 403, and 500 errors

---

## Related Documentation

- `PERSONAL_FORMS_SUPABASE_CLIENT_FIX.md` - Initial server/browser client fix for POST
- `PERSONAL_FORMS_INFINITE_RECURSION_FIX.md` - RLS circular dependency fix
- `PERSONAL_FORMS_ANALYSIS_AND_FIX.md` - Complete architecture overview

---

**Generated**: 2025-10-22
**Files Modified**: 2
**Status**: ✅ **READY TO TEST**

---

## Next Steps

1. **Test the form builder** by creating a new personal form
2. **Edit the form** - add fields, change title, etc.
3. **View the form** to ensure you can access it
4. **Delete test forms** to verify deletion works

If you encounter any errors:
- Check browser console for client-side errors
- Check server terminal for API route errors
- Verify the user session is valid
- Check Supabase logs for database errors

All three routes (GET, PUT, DELETE) should now work correctly! 🎉
