# Event & Form Access Control Enhancement - Implementation Plan

## 📋 Executive Summary

This plan addresses the need for granular, event-level access control where event creators have full ownership and can dynamically assign coordinators and form collaborators.

---

## 🎯 Current System Analysis

### Current Problems

1. **Over-Permissive Department Coordinator Access**
   - When assigned as department coordinator, users see ALL events in that department
   - No distinction between events they created vs. events created by others
   - Cannot limit access to specific events within a department

2. **No Event Ownership Model**
   - Current system: `events.created_by` and `events.coordinator_id` (single coordinator)
   - No clear "owner" concept with full control
   - Cannot assign multiple coordinators to one event

3. **Static Coordinator Assignment**
   - Coordinators are assigned at department level (too broad)
   - No way to dynamically assign coordinators to specific events
   - Event creators cannot control who helps manage their event

4. **No Form-Level Access Delegation**
   - Event coordinators cannot delegate form management to others
   - No granular permissions (view vs. edit vs. manage responses)
   - Cannot assign temporary or limited access to forms

### Current Access Model

```
Super Admin
  └─ All Institutions
       └─ Institution Coordinator
            └─ All Institution Events (too broad)
                 └─ Department Coordinator
                      └─ All Department Events (PROBLEM: too broad)
                           └─ Event Coordinator
                                └─ Assigned Events (PROBLEM: static assignment)
```

---

## 🎨 Proposed New Flow

### New Access Hierarchy

```
Super Admin
  └─ All Institutions
       └─ Institution Coordinator
            └─ All Institution Events ✓
                 └─ Event Owner (Creator)
                      ├─ Full Control of OWNED Event
                      ├─ Can Assign Event Coordinators (dynamic)
                      └─ Can Assign Form Collaborators (dynamic)
                           └─ Event Coordinator (Assigned)
                                ├─ Access to Assigned Events ONLY
                                └─ Can Manage Forms (if permitted)
                                     └─ Form Collaborator
                                          └─ Permission-Based Access (View/Edit/Manage)
```

### Key Improvements

1. ✅ **Event Ownership**: Clear owner with full control
2. ✅ **Dynamic Event Assignment**: Owners assign coordinators per event
3. ✅ **Granular Form Access**: Owners/coordinators assign form collaborators
4. ✅ **Permission Levels**: View, Edit, Manage responses
5. ✅ **Scoped Access**: Coordinators only see assigned events

---

## 🗄️ Database Schema Changes

### 1. New Table: `event_coordinators`

**Purpose**: Many-to-many relationship between events and coordinators

```sql
CREATE TABLE public.event_coordinators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'coordinator',
  -- Roles: 'owner', 'coordinator', 'viewer'
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_coordinators_event_id ON public.event_coordinators(event_id);
CREATE INDEX idx_event_coordinators_user_id ON public.event_coordinators(user_id);
CREATE INDEX idx_event_coordinators_role ON public.event_coordinators(role);

-- RLS Policies
ALTER TABLE public.event_coordinators ENABLE ROW LEVEL SECURITY;

-- Select: All authenticated users can see coordinator assignments
CREATE POLICY "event_coordinators_select_policy"
ON public.event_coordinators FOR SELECT
USING (auth.role() = 'authenticated');

-- Insert: Only event owners and admins can assign coordinators
CREATE POLICY "event_coordinators_insert_policy"
ON public.event_coordinators FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.event_coordinators ec
    WHERE ec.event_id = event_coordinators.event_id
    AND ec.user_id = auth.uid()
    AND ec.role = 'owner'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
);

-- Delete: Only event owners and admins can remove coordinators
CREATE POLICY "event_coordinators_delete_policy"
ON public.event_coordinators FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.event_coordinators ec
    WHERE ec.event_id = event_coordinators.event_id
    AND ec.user_id = auth.uid()
    AND ec.role = 'owner'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
);
```

### 2. New Table: `form_collaborators`

**Purpose**: Granular form access control with permission levels

```sql
CREATE TABLE public.form_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL DEFAULT 'view',
  -- Permissions: 'view', 'edit', 'manage_responses'
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(form_id, user_id)
);

CREATE INDEX idx_form_collaborators_form_id ON public.form_collaborators(form_id);
CREATE INDEX idx_form_collaborators_user_id ON public.form_collaborators(user_id);
CREATE INDEX idx_form_collaborators_permission ON public.form_collaborators(permission_level);

-- RLS Policies
ALTER TABLE public.form_collaborators ENABLE ROW LEVEL SECURITY;

-- Select: All authenticated users can see collaborator assignments
CREATE POLICY "form_collaborators_select_policy"
ON public.form_collaborators FOR SELECT
USING (auth.role() = 'authenticated');

-- Insert: Form creator, event owners, and admins can assign collaborators
CREATE POLICY "form_collaborators_insert_policy"
ON public.form_collaborators FOR INSERT
WITH CHECK (
  -- Form creator can assign
  EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = form_collaborators.form_id
    AND created_by = auth.uid()
  )
  OR
  -- Event owner can assign
  EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.event_coordinators ec ON ec.event_id = f.event_id
    WHERE f.id = form_collaborators.form_id
    AND ec.user_id = auth.uid()
    AND ec.role = 'owner'
  )
  OR
  -- Admins can assign
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
);

-- Delete: Same as insert
CREATE POLICY "form_collaborators_delete_policy"
ON public.form_collaborators FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = form_collaborators.form_id
    AND created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.event_coordinators ec ON ec.event_id = f.event_id
    WHERE f.id = form_collaborators.form_id
    AND ec.user_id = auth.uid()
    AND ec.role = 'owner'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
);
```

### 3. Update Existing Table: `events`

**Changes**: Keep `created_by` as event owner reference

```sql
-- Add comment to clarify ownership
COMMENT ON COLUMN public.events.created_by IS 'Event owner - has full control and can assign coordinators';

-- Add index for faster owner queries
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);

-- Note: coordinator_id field will be deprecated in favor of event_coordinators table
-- Keep it for backward compatibility during migration
```

### 4. Update RLS Policies

#### Events Table - Updated Policies

```sql
-- Drop old policies
DROP POLICY IF EXISTS "events_select_policy" ON public.events;
DROP POLICY IF EXISTS "events_update_policy" ON public.events;

-- New SELECT policy: View if owner, assigned coordinator, institution coordinator, or admin
CREATE POLICY "events_select_policy_v2"
ON public.events FOR SELECT
USING (
  -- Super admin and administrator
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
  OR
  -- Institution coordinator
  EXISTS (
    SELECT 1 FROM public.institution_coordinators ic
    WHERE ic.institution_id = events.institution_id
    AND ic.user_id = auth.uid()
  )
  OR
  -- Event owner or assigned coordinator
  EXISTS (
    SELECT 1 FROM public.event_coordinators ec
    WHERE ec.event_id = events.id
    AND ec.user_id = auth.uid()
  )
);

-- New UPDATE policy: Only owner, institution coordinator, or admin
CREATE POLICY "events_update_policy_v2"
ON public.events FOR UPDATE
USING (
  -- Super admin and administrator
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
  OR
  -- Institution coordinator
  EXISTS (
    SELECT 1 FROM public.institution_coordinators ic
    WHERE ic.institution_id = events.institution_id
    AND ic.user_id = auth.uid()
  )
  OR
  -- Event owner only (not just any coordinator)
  EXISTS (
    SELECT 1 FROM public.event_coordinators ec
    WHERE ec.event_id = events.id
    AND ec.user_id = auth.uid()
    AND ec.role = 'owner'
  )
);
```

#### Forms Table - Updated Policies

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Forms are viewable by authenticated users" ON public.forms;
DROP POLICY IF EXISTS "Forms are updatable by creator and admins" ON public.forms;

-- New SELECT policy: View if creator, event owner/coordinator, form collaborator, or admin
CREATE POLICY "forms_select_policy_v2"
ON public.forms FOR SELECT
USING (
  -- Super admin and administrator
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
  OR
  -- Institution coordinator
  EXISTS (
    SELECT 1 FROM public.institution_coordinators ic
    WHERE ic.institution_id = forms.institution_id
    AND ic.user_id = auth.uid()
  )
  OR
  -- Form creator
  created_by = auth.uid()
  OR
  -- Event owner or coordinator
  EXISTS (
    SELECT 1 FROM public.event_coordinators ec
    WHERE ec.event_id = forms.event_id
    AND ec.user_id = auth.uid()
  )
  OR
  -- Form collaborator (any permission level)
  EXISTS (
    SELECT 1 FROM public.form_collaborators fc
    WHERE fc.form_id = forms.id
    AND fc.user_id = auth.uid()
  )
  OR
  -- Public forms
  is_public = true
);

-- New UPDATE policy: Only creator, event owner, form collaborators with edit permission, or admin
CREATE POLICY "forms_update_policy_v2"
ON public.forms FOR UPDATE
USING (
  -- Super admin and administrator
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
  OR
  -- Institution coordinator
  EXISTS (
    SELECT 1 FROM public.institution_coordinators ic
    WHERE ic.institution_id = forms.institution_id
    AND ic.user_id = auth.uid()
  )
  OR
  -- Form creator
  created_by = auth.uid()
  OR
  -- Event owner
  EXISTS (
    SELECT 1 FROM public.event_coordinators ec
    WHERE ec.event_id = forms.event_id
    AND ec.user_id = auth.uid()
    AND ec.role = 'owner'
  )
  OR
  -- Form collaborator with edit permission
  EXISTS (
    SELECT 1 FROM public.form_collaborators fc
    WHERE fc.form_id = forms.id
    AND fc.user_id = auth.uid()
    AND fc.permission_level IN ('edit', 'manage_responses')
  )
);
```

#### Form Responses Table - Updated Policies

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Responses are viewable by form creator and institution members" ON public.form_responses;

-- New SELECT policy: View if creator, event owner/coordinator, form collaborator, or admin
CREATE POLICY "form_responses_select_policy_v2"
ON public.form_responses FOR SELECT
USING (
  -- Super admin and administrator
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
  OR
  -- Institution coordinator
  EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.institution_coordinators ic ON ic.institution_id = f.institution_id
    WHERE f.id = form_responses.form_id
    AND ic.user_id = auth.uid()
  )
  OR
  -- Form creator
  EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = form_responses.form_id
    AND created_by = auth.uid()
  )
  OR
  -- Event owner or coordinator
  EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.event_coordinators ec ON ec.event_id = f.event_id
    WHERE f.id = form_responses.form_id
    AND ec.user_id = auth.uid()
  )
  OR
  -- Form collaborator with view or manage_responses permission
  EXISTS (
    SELECT 1 FROM public.form_collaborators fc
    WHERE fc.form_id = form_responses.form_id
    AND fc.user_id = auth.uid()
  )
);
```

---

## 🔧 Service Layer Changes

### 1. New Service: `EventCoordinatorService`

**File**: `lib/services/organization/event-coordinator-service.ts`

```typescript
export class EventCoordinatorService {
  private static supabase = getSupabaseClient();

  // Assign coordinator to event
  static async assignCoordinator(
    eventId: string,
    userId: string,
    role: 'coordinator' | 'viewer' = 'coordinator'
  ): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();

    const { error } = await this.supabase
      .from('event_coordinators')
      .insert({
        event_id: eventId,
        user_id: userId,
        role,
        assigned_by: user.id
      });

    if (error) throw error;
  }

  // Remove coordinator from event
  static async removeCoordinator(eventId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('event_coordinators')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .neq('role', 'owner'); // Cannot remove owner

    if (error) throw error;
  }

  // Get event coordinators
  static async getEventCoordinators(eventId: string) {
    const { data, error } = await this.supabase
      .from('event_coordinators')
      .select(`
        id,
        role,
        created_at,
        user:profiles(id, full_name, email, avatar_url)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Check if user is event owner
  static async isEventOwner(eventId: string, userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('event_coordinators')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();

    return !!data;
  }

  // Check if user has access to event
  static async hasEventAccess(eventId: string, userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('event_coordinators')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    return !!data;
  }
}
```

### 2. New Service: `FormCollaboratorService`

**File**: `lib/services/forms/form-collaborator-service.ts`

```typescript
export class FormCollaboratorService {
  private static supabase = getSupabaseClient();

  // Assign collaborator to form
  static async assignCollaborator(
    formId: string,
    userId: string,
    permissionLevel: 'view' | 'edit' | 'manage_responses' = 'view'
  ): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();

    const { error } = await this.supabase
      .from('form_collaborators')
      .insert({
        form_id: formId,
        user_id: userId,
        permission_level: permissionLevel,
        assigned_by: user.id
      });

    if (error) throw error;
  }

  // Remove collaborator from form
  static async removeCollaborator(formId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('form_collaborators')
      .delete()
      .eq('form_id', formId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Update collaborator permission
  static async updateCollaboratorPermission(
    formId: string,
    userId: string,
    permissionLevel: 'view' | 'edit' | 'manage_responses'
  ): Promise<void> {
    const { error } = await this.supabase
      .from('form_collaborators')
      .update({ permission_level: permissionLevel })
      .eq('form_id', formId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Get form collaborators
  static async getFormCollaborators(formId: string) {
    const { data, error } = await this.supabase
      .from('form_collaborators')
      .select(`
        id,
        permission_level,
        created_at,
        user:profiles(id, full_name, email, avatar_url)
      `)
      .eq('form_id', formId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Check user's permission level
  static async getUserPermission(
    formId: string,
    userId: string
  ): Promise<'view' | 'edit' | 'manage_responses' | null> {
    const { data } = await this.supabase
      .from('form_collaborators')
      .select('permission_level')
      .eq('form_id', formId)
      .eq('user_id', userId)
      .maybeSingle();

    return data?.permission_level || null;
  }
}
```

### 3. Update Existing: `EventService`

**File**: `lib/services/organization/event-service.ts`

**Changes:**

```typescript
// Update createEvent to automatically create owner record
static async createEvent(data: CreateEventDto): Promise<Event> {
  const { data: { user } } = await this.supabase.auth.getUser();

  // Create event
  const { data: event, error } = await this.supabase
    .from('events')
    .insert({
      ...data,
      created_by: user.id,
      coordinator_id: user.id // Keep for backward compatibility
    })
    .select()
    .single();

  if (error) throw error;

  // Automatically create owner record in event_coordinators
  const { error: coordError } = await this.supabase
    .from('event_coordinators')
    .insert({
      event_id: event.id,
      user_id: user.id,
      role: 'owner',
      assigned_by: user.id
    });

  if (coordError) {
    // Rollback event creation if coordinator assignment fails
    await this.supabase.from('events').delete().eq('id', event.id);
    throw coordError;
  }

  return event;
}

// Add method to get events by user access
static async getUserEvents(userId: string, filters: EventFilters = {}) {
  let query = this.supabase
    .from('events')
    .select(`
      *,
      place:places(*),
      institution:institutions(*),
      department:departments(*),
      event_coordinators!inner(role)
    `)
    .eq('event_coordinators.user_id', userId);

  // Apply filters
  if (filters.institution_id) {
    query = query.eq('institution_id', filters.institution_id);
  }

  // ... other filters

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
```

### 4. Update Existing: `FormService`

**File**: `lib/services/form-service.ts`

**Changes:**

```typescript
// Update getFormResponses to check collaborator permissions
async getFormResponses(formId: string, user: { id: string; role?: string }) {
  // ... existing admin and institution coordinator checks ...

  // Check if user is form collaborator
  const { data: collaborator } = await this.supabase
    .from('form_collaborators')
    .select('permission_level')
    .eq('form_id', formId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (collaborator) {
    // Collaborators can view responses
    return this.fetchAllResponses(formId);
  }

  // Check if user is event owner or coordinator
  const { data: formData } = await this.supabase
    .from('forms')
    .select('event_id')
    .eq('id', formId)
    .single();

  if (formData?.event_id) {
    const { data: eventCoord } = await this.supabase
      .from('event_coordinators')
      .select('role')
      .eq('event_id', formData.event_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (eventCoord) {
      // Event coordinators can access
      return this.fetchAllResponses(formId);
    }
  }

  // ... rest of existing logic ...
}
```

---

## 🎨 UI/UX Changes

### 1. Event Details Page - Coordinator Management Section

**File**: `app/(routes)/organizations/events/[id]/page.tsx`

**New Section**: Add "Event Coordinators" card

```tsx
{/* Event Coordinators Section - Only visible to owner and admins */}
{(isOwner || isAdmin) && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <span>Event Coordinators</span>
        <Button onClick={() => setShowAddCoordinator(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Coordinator
        </Button>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <EventCoordinatorsList
        eventId={eventId}
        onRemove={handleRemoveCoordinator}
      />
    </CardContent>
  </Card>
)}
```

### 2. New Component: `EventCoordinatorsList`

**File**: `app/(routes)/organizations/events/_components/event-coordinators-list.tsx`

```tsx
export function EventCoordinatorsList({ eventId, onRemove }) {
  const [coordinators, setCoordinators] = useState([]);

  useEffect(() => {
    fetchCoordinators();
  }, [eventId]);

  const fetchCoordinators = async () => {
    const data = await EventCoordinatorService.getEventCoordinators(eventId);
    setCoordinators(data);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Added On</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {coordinators.map((coord) => (
          <TableRow key={coord.id}>
            <TableCell>{coord.user.full_name}</TableCell>
            <TableCell>{coord.user.email}</TableCell>
            <TableCell>
              <Badge variant={coord.role === 'owner' ? 'default' : 'outline'}>
                {coord.role}
              </Badge>
            </TableCell>
            <TableCell>{format(new Date(coord.created_at), 'MMM dd, yyyy')}</TableCell>
            <TableCell>
              {coord.role !== 'owner' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(coord.user.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### 3. New Component: `AddEventCoordinatorDialog`

**File**: `app/(routes)/organizations/events/_components/add-event-coordinator-dialog.tsx`

```tsx
export function AddEventCoordinatorDialog({ eventId, open, onClose, onSuccess }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [role, setRole] = useState<'coordinator' | 'viewer'>('coordinator');
  const [users, setUsers] = useState([]);

  const handleSubmit = async () => {
    await EventCoordinatorService.assignCoordinator(eventId, selectedUser, role);
    toast.success('Coordinator added successfully');
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Event Coordinator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="coordinator">Coordinator (Full Access)</SelectItem>
              <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Coordinator</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Form Details Page - Collaborators Management Section

**File**: `app/(routes)/organizations/events/[eventId]/forms/[formId]/page.tsx`

**New Section**: Add "Form Collaborators" card

```tsx
{/* Form Collaborators Section */}
{(canManageCollaborators) && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <span>Form Collaborators</span>
        <Button onClick={() => setShowAddCollaborator(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Collaborator
        </Button>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <FormCollaboratorsList
        formId={formId}
        onRemove={handleRemoveCollaborator}
        onUpdatePermission={handleUpdatePermission}
      />
    </CardContent>
  </Card>
)}
```

### 5. Events List Page - Updated Filtering

**File**: `app/(routes)/organizations/events/page.tsx`

**Changes**: Update to show only events user has access to

```tsx
// Fetch events based on user role
const fetchEvents = async () => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  let query = supabase.from('events').select(`
    *,
    place:places(*),
    institution:institutions(*),
    department:departments(*),
    event_coordinators!inner(role)
  `);

  // Super admin and administrator see all
  if (['super_admin', 'administrator'].includes(profile.role)) {
    // No filter needed
  }
  // Institution coordinator sees all institution events
  else if (profile.role === 'institution_coordinator') {
    const { data: coordData } = await supabase
      .from('institution_coordinators')
      .select('institution_id')
      .eq('user_id', user.id);

    if (coordData?.length) {
      const institutionIds = coordData.map(c => c.institution_id);
      query = query.in('institution_id', institutionIds);
    }
  }
  // Others only see events they're assigned to
  else {
    query = query.eq('event_coordinators.user_id', user.id);
  }

  const { data, error } = await query;
  setEvents(data || []);
};
```

### 6. Dashboard Updates

**File**: `app/(routes)/page.tsx`

**Changes**: Show "Owned Events" vs "Coordinating Events" separately

```tsx
{/* My Owned Events */}
<Card>
  <CardHeader>
    <CardTitle>Events I Own</CardTitle>
  </CardHeader>
  <CardContent>
    {ownedEvents.map(event => (
      <EventCard key={event.id} event={event} showManageLink />
    ))}
  </CardContent>
</Card>

{/* Events I Coordinate */}
<Card>
  <CardHeader>
    <CardTitle>Events I'm Coordinating</CardTitle>
  </CardHeader>
  <CardContent>
    {coordinatingEvents.map(event => (
      <EventCard key={event.id} event={event} />
    ))}
  </CardContent>
</Card>
```

---

## 🔄 Migration Strategy

### Phase 1: Database Setup (Week 1)

1. **Create New Tables**
   - Run migration to create `event_coordinators` table
   - Run migration to create `form_collaborators` table
   - Add indexes and RLS policies

2. **Migrate Existing Data**
   - For each existing event:
     - Create `event_coordinators` record with `created_by` as owner
     - If `coordinator_id` exists and different from `created_by`, add as coordinator
   - Test data integrity

3. **Update RLS Policies**
   - Drop old policies
   - Create new v2 policies
   - Test access control

### Phase 2: Service Layer (Week 2)

1. **Create New Services**
   - Implement `EventCoordinatorService`
   - Implement `FormCollaboratorService`
   - Write unit tests

2. **Update Existing Services**
   - Update `EventService.createEvent()` to create owner record
   - Update `EventService.getUserEvents()` for new filtering
   - Update `FormService.getFormResponses()` for collaborator access
   - Write integration tests

### Phase 3: UI Components (Week 3)

1. **Event Management UI**
   - Create `EventCoordinatorsList` component
   - Create `AddEventCoordinatorDialog` component
   - Update event details page
   - Test coordinator assignment flow

2. **Form Management UI**
   - Create `FormCollaboratorsList` component
   - Create `AddFormCollaboratorDialog` component
   - Update form details page
   - Test collaborator assignment flow

### Phase 4: Integration & Testing (Week 4)

1. **End-to-End Testing**
   - Test complete event creation → coordinator assignment flow
   - Test complete form creation → collaborator assignment flow
   - Test permission enforcement at all levels
   - Test edge cases (removing coordinators, permission changes)

2. **User Acceptance Testing**
   - Test with institution coordinators
   - Test with event coordinators
   - Gather feedback and iterate

### Phase 5: Deployment (Week 5)

1. **Production Deployment**
   - Deploy database migrations
   - Deploy service layer changes
   - Deploy UI updates
   - Monitor for issues

2. **Cleanup**
   - Remove deprecated code
   - Update documentation
   - Train users on new features

---

## 📊 Testing Checklist

### Access Control Tests

- [ ] Super Admin can see all events
- [ ] Institution Coordinator can see all institution events
- [ ] Event Owner can see and manage owned events
- [ ] Event Coordinator can see only assigned events
- [ ] Event Coordinator CANNOT see unassigned events in same department
- [ ] Form Collaborator with 'view' can only view
- [ ] Form Collaborator with 'edit' can edit form but not responses
- [ ] Form Collaborator with 'manage_responses' can view/export responses

### Event Management Tests

- [ ] Event creation automatically creates owner record
- [ ] Event owner can assign coordinators
- [ ] Event owner can remove coordinators
- [ ] Event owner cannot remove themselves
- [ ] Assigned coordinators receive notifications
- [ ] Removed coordinators lose access immediately

### Form Management Tests

- [ ] Event owner can assign form collaborators
- [ ] Event coordinators can assign form collaborators (if permitted)
- [ ] Form collaborators can be assigned different permission levels
- [ ] Permission level changes take effect immediately
- [ ] Form creator retains full access regardless of collaborators

### Migration Tests

- [ ] All existing events have owner records
- [ ] Existing coordinator_id migrated correctly
- [ ] No data loss during migration
- [ ] RLS policies enforce new access model
- [ ] Backward compatibility maintained

---

## 📈 Benefits Summary

### For Event Creators/Owners
✅ Full control over their events
✅ Can delegate responsibilities to trusted coordinators
✅ Can assign form management to specific users
✅ Clear ownership and accountability

### For Institution Coordinators
✅ Maintain oversight of all institution events
✅ Can still access all data within their scope
✅ Better visibility into event ownership

### For Event Coordinators
✅ Only see events they're actively involved in
✅ No clutter from unrelated department events
✅ Clear role and responsibilities

### For Form Collaborators
✅ Granular access based on needs
✅ Can help without full coordinator access
✅ Permission levels (view/edit/manage) provide flexibility

### For System Administration
✅ Granular audit trails (who assigned whom)
✅ Better security with permission levels
✅ Scalable access control model
✅ Reduced over-permissioning

---

## 🎯 Success Metrics

1. **User Satisfaction**: Event coordinators only see relevant events (target: 100% accuracy)
2. **Performance**: No degradation in query performance (target: <100ms for event list)
3. **Adoption**: 80% of event owners use coordinator assignment feature within 3 months
4. **Security**: Zero unauthorized access incidents
5. **Scalability**: System handles 1000+ events per institution efficiently

---

## 📝 Next Steps

1. **Review and Approve**: Stakeholders review this implementation plan
2. **Refine**: Incorporate feedback and adjust timeline
3. **Kickoff**: Begin Phase 1 database setup
4. **Iterate**: Weekly check-ins to track progress
5. **Deploy**: Phased rollout starting with test institution

---

## ❓ Questions for Clarification

Before implementation, please confirm:

1. **Department Coordinators**: Should we keep the `department_coordinators` table or deprecate it in favor of event-level assignments?
2. **Notification System**: Should we send email/in-app notifications when users are assigned as coordinators?
3. **Permission Defaults**: What should be the default permission level for new form collaborators?
4. **Bulk Assignment**: Do we need bulk assignment features (assign multiple coordinators at once)?
5. **Historical Data**: Should we maintain an audit log of coordinator/collaborator changes?

---

**Document Version**: 1.0
**Created**: 2025-01-18
**Last Updated**: 2025-01-18
**Status**: Pending Approval
