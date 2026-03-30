# Event Coordinator Access Control Implementation

## Overview
This document describes the access control system for adding and managing event coordinators in the event details page.

## Access Control Rules

### Who Can Add Coordinators?

1. **Super Admin** (Role: `SUPER_ADMIN`)
   - ✅ Can add coordinators to **ALL events** across all institutions
   - ✅ Can manage (edit/remove) coordinators for any event
   - ✅ Full access without restrictions

2. **Administrator** (Role: `ADMINISTRATOR`)
   - ✅ Can add coordinators to **ALL events** across all institutions
   - ✅ Can manage (edit/remove) coordinators for any event
   - ✅ Full access without restrictions

3. **Institution Coordinator** (Role: `INSTITUTION_COORDINATOR`)
   - ✅ Can add coordinators to events **in their institution only**
   - ✅ Can manage coordinators for events in their institution
   - ❌ Cannot add coordinators to events in other institutions
   - **Condition**: `event.institution_id === user.coordinatorInstitutionId`

4. **Event Owner** (Creator of the event)
   - ✅ Can add coordinators to events **they created**
   - ✅ Can manage coordinators for their events
   - ❌ Cannot manage coordinators for events they don't own
   - **Condition**: `user.id === event.created_by` (determined by `isEventOwner` flag)

5. **Event Coordinator** (Role: `EVENT_COORDINATOR` but not owner)
   - ❌ Cannot add coordinators
   - ❌ Cannot manage coordinators
   - ✅ Can only view coordinator list

## Implementation Details

### Event Details Page (`page.tsx`)

**State Variables Added:**
```typescript
const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
```

**Data Fetched:**
- User's role from `profiles` table
- User's institution ID if they are an institution coordinator
- Event ownership status

**Props Passed to EventCoordinatorsCard:**
```typescript
<EventCoordinatorsCard
  eventId={event.id}
  eventInstitutionId={event.institution_id || null}
  currentUserId={currentUserId}
  currentUserRole={currentUserRole}
  coordinatorInstitutionId={coordinatorInstitutionId}
  isOwner={isEventOwner}
/>
```

### EventCoordinatorsCard Component

**Access Control Logic:**
```typescript
const canManageCoordinators =
  // Super admin and Administrator can manage all events
  currentUserRole === UserRole.SUPER_ADMIN ||
  currentUserRole === UserRole.ADMINISTRATOR ||
  // Event owner can manage their event
  isOwner ||
  // Institution coordinator can manage events in their institution
  (currentUserRole === UserRole.INSTITUTION_COORDINATOR &&
    coordinatorInstitutionId &&
    eventInstitutionId &&
    coordinatorInstitutionId === eventInstitutionId);
```

**UI Changes:**
- "Add Coordinator" button shown only if `canManageCoordinators === true`
- Role change dropdown shown only if `canManageCoordinators === true`
- Remove coordinator button shown only if `canManageCoordinators === true`
- Otherwise, only coordinator role badge is displayed (read-only view)

## User Experience

### For Super Admin/Administrator:
1. Navigate to any event details page
2. See "Event Coordinators" card with "Add Coordinator" button
3. Click "Add Coordinator" to open dialog
4. Select user and assign role (Coordinator or Viewer)
5. Can edit roles and remove coordinators

### For Institution Coordinator:
1. Navigate to an event in **their institution**
2. See "Event Coordinators" card with "Add Coordinator" button
3. Can only add coordinators to events in their institution
4. For events in other institutions: View-only access (no manage buttons)

### For Event Owner (Creator):
1. Navigate to an event **they created**
2. See "Event Coordinators" card with "Add Coordinator" button
3. Can manage coordinators for their own events
4. For events created by others: View-only access

### For Regular Event Coordinator:
1. Navigate to an event they coordinate
2. See "Event Coordinators" card (view-only)
3. No "Add Coordinator" button
4. No edit/remove options
5. Can only view the list of coordinators

## Database Structure

### Relevant Tables:

**`event_coordinators`** - Stores event coordinator assignments
- `event_id` - Reference to event
- `user_id` - Reference to user
- `role` - 'owner' | 'coordinator' (viewer role removed)
- `assigned_by` - User who assigned this coordinator

**`institution_coordinators`** - Links users to institutions
- `user_id` - Reference to user
- `institution_id` - Reference to institution

**`profiles`** - User profiles with roles
- `id` - User ID
- `role` - User role (SUPER_ADMIN, ADMINISTRATOR, INSTITUTION_COORDINATOR, EVENT_COORDINATOR, etc.)

## Security Notes

1. **Server-side validation**: The `EventCoordinatorService.assignCoordinator()` method should also validate permissions on the backend
2. **RLS Policies**: Supabase Row Level Security policies should be configured to enforce these access rules at the database level
3. **Role verification**: Always verify user roles from the database, not from client-side state alone

## Testing Checklist

- [ ] Super admin can add coordinators to any event
- [ ] Administrator can add coordinators to any event
- [ ] Institution coordinator can add coordinators only to events in their institution
- [ ] Institution coordinator cannot add coordinators to events in other institutions
- [ ] Event owner can add coordinators to events they created
- [ ] Event owner cannot add coordinators to events created by others
- [ ] Regular event coordinator cannot add coordinators (view-only)
- [ ] "Add Coordinator" button appears/disappears based on permissions
- [ ] Edit role dropdown appears/disappears based on permissions
- [ ] Remove coordinator button appears/disappears based on permissions

## Recent Updates

### Institution-Based User Filtering (Latest)
- **Change**: Modified Add Event Coordinator dialog to only show users from the same institution
- **Implementation**: Fetches users by joining `department_coordinators` with `departments` table, filtering by event's `institution_id`
- **How it works**: Event coordinators are assigned to departments, departments belong to institutions, so we filter by institution through the department relationship
- **Deduplication**: Users who coordinate multiple departments appear only once in the list
- **Benefit**: Ensures coordinators are only assigned from within the event's institution

### Removed Viewer Role
- **Change**: Removed 'viewer' role option, keeping only 'coordinator' role
- **Rationale**: Simplified role structure - coordinators have full access, no need for read-only viewers
- **Impact**: All assigned coordinators now have the same level of access

### Improved User Experience
- **Scrolling**: Added ScrollArea component to user selection dialog for better UX when many users are available
- **Role Display**: Replaced dropdown with static badge display since all coordinators have the same role

## Future Enhancements

1. **Audit Log**: Track who added/removed coordinators and when
2. **Bulk Assignment**: Allow assigning multiple coordinators at once
3. **Notification**: Notify users when they are added as coordinators
4. **Permission Inheritance**: Consider automatic coordinator assignment based on institution/department hierarchy
