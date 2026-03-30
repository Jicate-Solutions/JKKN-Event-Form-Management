# Personal Forms Implementation Plan

## Overview
Implementation of personal forms feature with collaboration and permission-based sharing, completely independent from institutional hierarchy.

**Estimated Timeline:** 5-7 days
**Risk Level:** Medium (new tables, but clean separation from existing code)

---

## Architecture Summary

### New Database Tables
1. `personal_forms` - Form definitions (no institution_id)
2. `personal_form_collaborators` - Permission-based sharing
3. `personal_form_responses` - Form submissions

### Permission System
4 granular capabilities:
- `can_edit_structure` - Modify fields and conditional logic
- `can_view_responses` - See submissions and statistics
- `can_export_data` - Download CSV/Excel
- `can_manage_collaborators` - Add/remove users

### Key Design Decisions
- ✅ Separate tables (no modification to existing forms)
- ✅ No payment support for personal forms
- ✅ Multiple owners possible
- ✅ User search only (existing users)
- ✅ Reuse existing form builder, analytics, exports
- ✅ Workspace switcher UI pattern

---

## Phase 1: Database Foundation
**Estimated Time:** 1 day

### Task 1.1: Create Database Migration
**File:** `lib/sql/add_personal_forms.sql`

```sql
-- 1. Create personal_forms table
-- 2. Create personal_form_collaborators table
-- 3. Create personal_form_responses table
-- 4. Add indexes
-- 5. Enable RLS
-- 6. Create all RLS policies (see Section 2 of design)
-- 7. Add updated_at trigger
```

**Checklist:**
- [ ] Create migration file
- [ ] Test migration on local Supabase
- [ ] Verify RLS policies work correctly
- [ ] Test cascade deletes
- [ ] Verify unique constraints

### Task 1.2: Apply Migration to Database
**Command:** Use Supabase dashboard or CLI

**Checklist:**
- [ ] Backup database before migration
- [ ] Apply migration to development
- [ ] Verify tables created successfully
- [ ] Test RLS policies with different users
- [ ] Document rollback procedure

### Task 1.3: Update Supabase Types
**File:** `types/supabase.ts`

**Command:**
```bash
# If using Supabase CLI
supabase gen types typescript --local > types/supabase.ts
```

**Checklist:**
- [ ] Regenerate types
- [ ] Verify new tables appear in types
- [ ] Commit updated types file

---

## Phase 2: TypeScript Types & Utilities
**Estimated Time:** 0.5 days

### Task 2.1: Create Personal Forms Types
**File:** `types/personal-forms.ts`

```typescript
// Define:
// - PersonalForm interface
// - PersonalFormCollaborator interface
// - PersonalFormResponse interface
// - PersonalFormPermission type
// - Workspace type
```

**Checklist:**
- [ ] Create types file
- [ ] Import FormField from types/forms.ts
- [ ] Export all interfaces
- [ ] Add JSDoc comments

### Task 2.2: Create Permission Helper Utilities
**File:** `lib/utils/personal-form-permissions.ts`

```typescript
// Utility functions:
// - hasPermission(collaborator, permission)
// - canUserEdit(userId, formId)
// - canUserViewResponses(userId, formId)
// - canUserExport(userId, formId)
// - canUserManageCollaborators(userId, formId)
```

**Checklist:**
- [ ] Create permission helper functions
- [ ] Add TypeScript type guards
- [ ] Export utility functions
- [ ] Add unit tests (optional)

---

## Phase 3: Service Layer
**Estimated Time:** 1.5 days

### Task 3.1: Create PersonalFormService
**File:** `lib/services/personal-form-service.ts`

**Methods to implement:**
```typescript
// CRUD Operations
- createPersonalForm()
- getPersonalForms()
- getPersonalForm(idOrSlug)
- updatePersonalForm()
- deletePersonalForm()
- duplicateFromInstitutionalForm()

// Collaborator Management
- addCollaborator()
- updateCollaboratorPermissions()
- getCollaborators()
- removeCollaborator()
- checkUserPermission()

// Response Management
- submitResponse()
- getResponses()
- getResponseById()
- getResponseStatistics()

// Export Functions
- exportToCSV()
- exportToExcel()

// Helper Functions
- checkSlugExists()
- canAcceptSubmission()
- generateSubmissionId()
```

**Checklist:**
- [ ] Create service file
- [ ] Implement all CRUD methods
- [ ] Implement collaborator methods
- [ ] Implement response methods
- [ ] Implement export methods
- [ ] Add error handling
- [ ] Add TypeScript types for all methods
- [ ] Test each method with Supabase client

### Task 3.2: Create Response Statistics Service
**File:** `lib/services/personal-form-statistics.ts`

```typescript
// Reuse patterns from existing form statistics
- getResponseCount()
- getSubmissionTrend()
- getFieldStatistics()
- getCompletionRate()
```

**Checklist:**
- [ ] Create statistics service
- [ ] Adapt existing FormService statistics methods
- [ ] Test with sample data
- [ ] Verify calculations are correct

---

## Phase 4: API Routes
**Estimated Time:** 1 day

### Task 4.1: Personal Forms CRUD API
**File:** `app/api/personal-forms/route.ts`

```typescript
// GET /api/personal-forms - List all personal forms
// POST /api/personal-forms - Create new form
```

**File:** `app/api/personal-forms/[formId]/route.ts`

```typescript
// GET /api/personal-forms/[formId] - Get single form
// PUT /api/personal-forms/[formId] - Update form
// DELETE /api/personal-forms/[formId] - Delete form
```

**Checklist:**
- [ ] Create route files
- [ ] Implement GET (list)
- [ ] Implement POST (create)
- [ ] Implement GET (single)
- [ ] Implement PUT (update)
- [ ] Implement DELETE
- [ ] Add authentication checks
- [ ] Add permission checks
- [ ] Test all endpoints with Postman/curl

### Task 4.2: Collaborators API
**File:** `app/api/personal-forms/[formId]/collaborators/route.ts`

```typescript
// GET - List collaborators
// POST - Add collaborator
```

**File:** `app/api/personal-forms/[formId]/collaborators/[collaboratorId]/route.ts`

```typescript
// PUT - Update permissions
// DELETE - Remove collaborator
```

**Checklist:**
- [ ] Create route files
- [ ] Implement list collaborators
- [ ] Implement add collaborator
- [ ] Implement update permissions
- [ ] Implement remove collaborator
- [ ] Add permission checks (can_manage_collaborators)
- [ ] Prevent creator removal
- [ ] Test all endpoints

### Task 4.3: Responses API
**File:** `app/api/personal-forms/[formId]/responses/route.ts`

```typescript
// GET - List responses (permission check: can_view_responses)
// POST - Submit response (public or authenticated)
```

**Checklist:**
- [ ] Create route file
- [ ] Implement list responses
- [ ] Implement submit response
- [ ] Check submission limits
- [ ] Generate submission IDs
- [ ] Add permission checks
- [ ] Test submission flow

### Task 4.4: Export API
**File:** `app/api/personal-forms/[formId]/export/route.ts`

```typescript
// GET /api/personal-forms/[formId]/export?format=csv
// GET /api/personal-forms/[formId]/export?format=excel
```

**Checklist:**
- [ ] Create route file
- [ ] Implement CSV export
- [ ] Implement Excel export
- [ ] Add permission check (can_export_data)
- [ ] Set proper headers
- [ ] Test downloads

### Task 4.5: Duplicate API
**File:** `app/api/personal-forms/duplicate/route.ts`

```typescript
// POST /api/personal-forms/duplicate
// Body: { sourceFormId: string, sourceType: 'institutional' | 'personal' }
```

**Checklist:**
- [ ] Create route file
- [ ] Implement duplication from institutional forms
- [ ] Strip payment fields
- [ ] Implement duplication from personal forms
- [ ] Test duplication flow

---

## Phase 5: UI Components (Shared)
**Estimated Time:** 1 day

### Task 5.1: Workspace Switcher
**File:** `components/workspace/workspace-switcher.tsx`

**Checklist:**
- [ ] Create component
- [ ] Add Personal/Organization toggle
- [ ] Add icons (User, Building2)
- [ ] Handle navigation
- [ ] Style with Tailwind
- [ ] Make responsive

### Task 5.2: Add Collaborator Dialog
**File:** `components/personal-forms/add-collaborator-dialog.tsx`

**Features:**
- User search (existing users only)
- Permission checkboxes (4 permissions)
- Owner toggle
- Add button

**Checklist:**
- [ ] Create dialog component
- [ ] Implement user search
- [ ] Add permission checkboxes
- [ ] Add form validation
- [ ] Handle submission
- [ ] Add loading states
- [ ] Test with different users

### Task 5.3: Permission Toggle Component
**File:** `components/personal-forms/permission-toggle.tsx`

**Checklist:**
- [ ] Create toggle component
- [ ] Add label and description
- [ ] Handle permission updates
- [ ] Add optimistic updates
- [ ] Show loading state
- [ ] Add error handling

### Task 5.4: Collaborator List Component
**File:** `components/personal-forms/collaborator-list.tsx`

**Checklist:**
- [ ] Create list component
- [ ] Display user info (avatar, name, email)
- [ ] Show owner badge
- [ ] Show permission toggles
- [ ] Add remove button (with confirmation)
- [ ] Disable remove for creator
- [ ] Test with multiple collaborators

### Task 5.5: Personal Form Card
**File:** `components/personal-forms/personal-form-card.tsx`

**Checklist:**
- [ ] Create card component
- [ ] Display form info
- [ ] Show status badge
- [ ] Show response count
- [ ] Add action menu (edit, delete, share)
- [ ] Add collaborator avatars
- [ ] Make responsive

---

## Phase 6: Pages & Routes (Personal Workspace)
**Estimated Time:** 1.5 days

### Task 6.1: Personal Dashboard
**File:** `app/(routes)/personal/page.tsx`

**Features:**
- Recent personal forms
- Quick stats (total forms, total responses)
- Quick actions (create form)

**Checklist:**
- [ ] Create page
- [ ] Fetch recent forms
- [ ] Display statistics
- [ ] Add quick actions
- [ ] Style layout

### Task 6.2: Personal Forms List
**File:** `app/(routes)/personal/forms/page.tsx`

**Features:**
- DataTable with personal forms
- Search and filters
- Create button
- Status filters

**Checklist:**
- [ ] Create page
- [ ] Implement DataTable
- [ ] Add columns definition
- [ ] Add search
- [ ] Add filters
- [ ] Add create button
- [ ] Test pagination

**File:** `app/(routes)/personal/forms/_components/columns.tsx`

**Checklist:**
- [ ] Create columns file
- [ ] Add title column
- [ ] Add status column
- [ ] Add responses count column
- [ ] Add collaborators column
- [ ] Add actions column
- [ ] Add sorting

### Task 6.3: Create Personal Form
**File:** `app/(routes)/personal/forms/new/page.tsx`

**Features:**
- Form title/description
- Choose to start blank or from template
- Option to duplicate from institutional form

**Checklist:**
- [ ] Create page
- [ ] Add form fields
- [ ] Add template selection
- [ ] Add duplicate option
- [ ] Handle form submission
- [ ] Redirect to builder
- [ ] Add validation

### Task 6.4: Form Builder
**File:** `app/(routes)/personal/forms/builder/[formId]/page.tsx`

**Strategy:** Reuse existing form builder, just pass PersonalFormService

**Checklist:**
- [ ] Create page
- [ ] Wrap existing FormBuilder component
- [ ] Pass PersonalFormService methods
- [ ] Handle save operations
- [ ] Test conditional logic
- [ ] Test all field types
- [ ] Verify no payment fields appear

### Task 6.5: Form Details & Analytics
**File:** `app/(routes)/personal/forms/[formId]/page.tsx`

**Features:**
- Form overview
- Response statistics (reuse existing charts)
- Quick actions (edit, view responses, share)

**Checklist:**
- [ ] Create page
- [ ] Fetch form details
- [ ] Display statistics
- [ ] Reuse existing chart components
- [ ] Add action buttons
- [ ] Test with different permission levels

### Task 6.6: Edit Form
**File:** `app/(routes)/personal/forms/[formId]/edit/page.tsx`

**Checklist:**
- [ ] Create page
- [ ] Load form data
- [ ] Implement edit form
- [ ] Check can_edit_structure permission
- [ ] Handle save
- [ ] Add validation
- [ ] Test updates

### Task 6.7: View Responses
**File:** `app/(routes)/personal/forms/[formId]/responses/page.tsx`

**Features:**
- DataTable with responses
- View individual response
- Export buttons (CSV/Excel)

**Checklist:**
- [ ] Create page
- [ ] Check can_view_responses permission
- [ ] Implement DataTable
- [ ] Add response columns
- [ ] Add view response dialog
- [ ] Add export buttons (check can_export_data)
- [ ] Test with large datasets (>1000 responses)

**File:** `app/(routes)/personal/forms/[formId]/responses/_components/columns.tsx`

**Checklist:**
- [ ] Create columns file
- [ ] Add submission_id column
- [ ] Add submitted_at column
- [ ] Add user_email column
- [ ] Add dynamic field columns
- [ ] Add actions column

### Task 6.8: Manage Collaborators
**File:** `app/(routes)/personal/forms/[formId]/collaborators/page.tsx`

**Features:**
- List all collaborators
- Add collaborator button
- Permission toggles
- Remove collaborator

**Checklist:**
- [ ] Create page
- [ ] Check can_manage_collaborators permission
- [ ] Display collaborator list
- [ ] Add AddCollaboratorDialog
- [ ] Implement permission toggles
- [ ] Add remove functionality
- [ ] Prevent creator removal
- [ ] Test permission updates

### Task 6.9: Form Settings
**File:** `app/(routes)/personal/forms/[formId]/settings/page.tsx`

**Features:**
- Form title/description
- Public/private toggle
- Submission limit
- Delete form

**Checklist:**
- [ ] Create page
- [ ] Add settings form
- [ ] Implement updates
- [ ] Add delete confirmation
- [ ] Handle deletion
- [ ] Redirect after delete

### Task 6.10: Public Submission Page
**File:** `app/forms/personal/[formIdOrSlug]/page.tsx`

**Features:**
- Public form submission (no auth if is_public)
- Reuse existing FormFieldRenderer
- Submission confirmation

**Checklist:**
- [ ] Create page
- [ ] Check form is_public status
- [ ] Render form fields
- [ ] Handle conditional logic
- [ ] Implement submission
- [ ] Show confirmation
- [ ] Handle submission limits
- [ ] Test anonymous submissions

---

## Phase 7: Layout & Navigation
**Estimated Time:** 0.5 days

### Task 7.1: Update Main Layout
**File:** `app/(routes)/layout.tsx`

**Checklist:**
- [ ] Add WorkspaceSwitcher to header/sidebar
- [ ] Update navigation for personal workspace
- [ ] Test workspace switching
- [ ] Ensure responsive

### Task 7.2: Personal Workspace Layout
**File:** `app/(routes)/personal/layout.tsx`

**Checklist:**
- [ ] Create layout
- [ ] Add personal workspace navigation
- [ ] Add breadcrumbs
- [ ] Style consistently with org workspace

### Task 7.3: Update Sidebar Navigation
**File:** `components/sidebar/sidebar.tsx` (or equivalent)

**Checklist:**
- [ ] Add "Personal" section
- [ ] Add "My Forms" link
- [ ] Add icons
- [ ] Highlight active routes
- [ ] Test navigation

---

## Phase 8: Middleware & Route Protection
**Estimated Time:** 0.5 days

### Task 8.1: Update Middleware
**File:** `middleware.ts`

**Checklist:**
- [ ] Add `/personal` routes to PROTECTED_ROUTES
- [ ] Allow all authenticated users (including students)
- [ ] Add `/forms/personal/(.*)` to public routes
- [ ] Test route protection
- [ ] Test with different roles

---

## Phase 9: Integration & Polish
**Estimated Time:** 1 day

### Task 9.1: Add Duplication Feature to Institutional Forms
**File:** `app/(routes)/organizations/events/[id]/forms/[formId]/page.tsx`

**Checklist:**
- [ ] Add "Duplicate to Personal" button
- [ ] Implement duplication flow
- [ ] Show success message
- [ ] Redirect to personal form
- [ ] Test duplication

### Task 9.2: Add Personal Forms to User Profile/Dashboard
**File:** `app/(routes)/page.tsx`

**Checklist:**
- [ ] Show personal forms count in dashboard
- [ ] Add quick link to personal workspace
- [ ] Test with different users

### Task 9.3: Email Notifications (Optional)
**File:** `app/api/email/route.ts`

**Features:**
- Notify when added as collaborator
- Notify when permissions changed

**Checklist:**
- [ ] Create email templates
- [ ] Send on collaborator add
- [ ] Send on permission change
- [ ] Test email delivery

### Task 9.4: Error Handling
**Checklist:**
- [ ] Add error boundaries to all pages
- [ ] Add user-friendly error messages
- [ ] Handle 404s (form not found)
- [ ] Handle permission denied errors
- [ ] Test error scenarios

### Task 9.5: Loading States
**Checklist:**
- [ ] Add loading skeletons to all pages
- [ ] Add loading spinners to buttons
- [ ] Add optimistic updates where appropriate
- [ ] Test slow network conditions

---

## Phase 10: Testing & Documentation
**Estimated Time:** 1 day

### Task 10.1: Manual Testing Checklist

**Form Creation & Management:**
- [ ] Create personal form
- [ ] Edit personal form
- [ ] Delete personal form
- [ ] Publish/unpublish form
- [ ] Set submission limit
- [ ] Generate slug correctly

**Collaboration:**
- [ ] Add collaborator
- [ ] Update collaborator permissions
- [ ] Remove collaborator
- [ ] Cannot remove creator
- [ ] Multiple owners work correctly
- [ ] Permission checks work (edit, view, export, manage)

**Form Responses:**
- [ ] Submit response (authenticated)
- [ ] Submit response (anonymous, if public)
- [ ] View responses (with permission)
- [ ] Cannot view without permission
- [ ] Export CSV (with permission)
- [ ] Export Excel (with permission)
- [ ] Cannot export without permission
- [ ] Submission limit enforced

**Duplication:**
- [ ] Duplicate from institutional form
- [ ] Payment fields removed
- [ ] Conditional logic preserved
- [ ] Duplicate from personal form

**UI/UX:**
- [ ] Workspace switcher works
- [ ] Navigation correct
- [ ] All pages responsive
- [ ] Dark mode works
- [ ] Loading states shown
- [ ] Error messages clear

**Security:**
- [ ] RLS policies enforce correctly
- [ ] Permission checks work
- [ ] Cannot access others' private forms
- [ ] Public forms accessible without auth
- [ ] Middleware protects routes

### Task 10.2: Test with Different User Roles
**Checklist:**
- [ ] Test as student
- [ ] Test as staff
- [ ] Test as event_coordinator
- [ ] Test as institution_coordinator
- [ ] Test as administrator
- [ ] Test as super_admin

### Task 10.3: Performance Testing
**Checklist:**
- [ ] Test with >1000 responses
- [ ] Test export with large datasets
- [ ] Test pagination
- [ ] Verify query performance
- [ ] Check N+1 query issues

### Task 10.4: Documentation
**File:** `PERSONAL_FORMS_FEATURE.md`

**Checklist:**
- [ ] Document feature overview
- [ ] Document permission system
- [ ] Document API endpoints
- [ ] Add usage examples
- [ ] Document known limitations
- [ ] Add troubleshooting guide

### Task 10.5: Update CLAUDE.md
**File:** `CLAUDE.md`

**Checklist:**
- [ ] Add personal forms to architecture overview
- [ ] Document new tables
- [ ] Document new services
- [ ] Add routing information
- [ ] Update file locations reference

---

## Phase 11: Deployment
**Estimated Time:** 0.5 days

### Task 11.1: Prepare for Production
**Checklist:**
- [ ] Review all migrations
- [ ] Backup production database
- [ ] Test migration on staging
- [ ] Verify no breaking changes to existing features
- [ ] Check environment variables

### Task 11.2: Deploy to Production
**Checklist:**
- [ ] Apply database migration
- [ ] Deploy code
- [ ] Verify all routes work
- [ ] Monitor for errors
- [ ] Test critical flows

### Task 11.3: Post-Deployment Monitoring
**Checklist:**
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify RLS policies working
- [ ] Test with real users
- [ ] Collect feedback

---

## Rollback Plan

If issues occur in production:

1. **Code Rollback:**
   - Revert to previous deployment
   - Personal forms feature disabled

2. **Database Rollback:**
   ```sql
   -- Drop tables in reverse order
   DROP TABLE IF EXISTS personal_form_responses CASCADE;
   DROP TABLE IF EXISTS personal_form_collaborators CASCADE;
   DROP TABLE IF EXISTS personal_forms CASCADE;
   ```

3. **Verification:**
   - Ensure existing forms still work
   - Verify no data loss in institutional forms

---

## Success Criteria

### Functional Requirements
- ✅ Users can create personal forms independent of institutions
- ✅ Forms support all field types except payment
- ✅ Conditional logic works correctly
- ✅ Collaboration system with 4 granular permissions works
- ✅ Multiple owners supported
- ✅ Public submission works
- ✅ Submission limits enforced
- ✅ Export to CSV/Excel works
- ✅ Analytics reuse existing components
- ✅ Duplication from institutional forms works

### Technical Requirements
- ✅ RLS policies secure all data
- ✅ No impact on existing institutional forms
- ✅ Performance acceptable (>1000 responses)
- ✅ All routes protected correctly
- ✅ Error handling comprehensive

### UX Requirements
- ✅ Workspace switcher intuitive
- ✅ Navigation clear
- ✅ Permission system understandable
- ✅ Loading states present
- ✅ Responsive design
- ✅ Dark mode support

---

## Known Limitations

1. **No Payment Support:** Personal forms cannot collect payments (by design)
2. **User Search Only:** Cannot invite external users by email (by design)
3. **No Offline Support:** Requires active internet connection
4. **Creator Cannot Be Removed:** Form creator always has access (by design)

---

## Future Enhancements (Post-MVP)

1. **Email Invitations:** Invite external users via email
2. **Form Templates Library:** Share personal form templates publicly
3. **Version History:** Track changes to form structure
4. **Advanced Analytics:** Custom reports, data visualization
5. **Webhooks:** Trigger actions on form submission
6. **API Access:** Public API for form submissions
7. **Form Themes:** Custom styling per form
8. **Conditional Notifications:** Email alerts based on responses

---

## File Structure Summary

```
D:\Projects\JKKN-Event-Form-Management\
├── lib/
│   ├── sql/
│   │   └── add_personal_forms.sql (NEW)
│   ├── services/
│   │   ├── personal-form-service.ts (NEW)
│   │   └── personal-form-statistics.ts (NEW)
│   └── utils/
│       └── personal-form-permissions.ts (NEW)
│
├── types/
│   └── personal-forms.ts (NEW)
│
├── app/
│   ├── (routes)/
│   │   └── personal/ (NEW)
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       └── forms/
│   │           ├── page.tsx
│   │           ├── new/
│   │           ├── builder/
│   │           └── [formId]/
│   │               ├── page.tsx
│   │               ├── edit/
│   │               ├── responses/
│   │               ├── collaborators/
│   │               └── settings/
│   │
│   ├── forms/
│   │   └── personal/
│   │       └── [formIdOrSlug]/
│   │           └── page.tsx (NEW)
│   │
│   └── api/
│       └── personal-forms/ (NEW)
│           ├── route.ts
│           ├── [formId]/
│           ├── duplicate/
│           └── export/
│
└── components/
    ├── workspace/
    │   └── workspace-switcher.tsx (NEW)
    └── personal-forms/ (NEW)
        ├── add-collaborator-dialog.tsx
        ├── permission-toggle.tsx
        ├── collaborator-list.tsx
        └── personal-form-card.tsx
```

---

## Estimated Total Timeline

| Phase | Estimated Time |
|-------|----------------|
| 1. Database Foundation | 1 day |
| 2. Types & Utilities | 0.5 days |
| 3. Service Layer | 1.5 days |
| 4. API Routes | 1 day |
| 5. UI Components | 1 day |
| 6. Pages & Routes | 1.5 days |
| 7. Layout & Navigation | 0.5 days |
| 8. Middleware | 0.5 days |
| 9. Integration & Polish | 1 day |
| 10. Testing & Docs | 1 day |
| 11. Deployment | 0.5 days |
| **TOTAL** | **10.5 days** |

With buffer for unexpected issues: **12-14 days**

---

## Next Steps

Ready to start implementation? Recommended order:

1. **Start with Phase 1** (Database) - This is the foundation
2. **Then Phase 2** (Types) - Need types before coding
3. **Then Phase 3** (Services) - Core business logic
4. **Then Phase 4** (API) - Backend complete
5. **Then Phases 5-7** (UI) - User-facing features
6. **Then Phase 8** (Security) - Lock down routes
7. **Then Phases 9-11** (Polish, Test, Deploy) - Finalize

Would you like me to start with Phase 1: Database Migration?
