# MYJKKN API Field Analysis & Strategy

## Critical Issues to Resolve

### Issue 1: Multiple Email Fields - Which to Use?

#### Student Endpoint Returns:
Based on your feedback, the student endpoint has **TWO email fields**:
- `student_email` - Personal/alternate email
- `college_email` - **Institutional email (PREFERRED)**

#### Staff Endpoint Returns:
Similarly, staff endpoint has **TWO email fields**:
- `email` or `staff_email` - Personal/alternate email
- `institution_email` - **Institutional email (PREFERRED)**

#### ✅ DECISION: Always Use Institutional Emails
**Reasoning:**
- Users can only access their institutional email (@jkkn.ac.in)
- College/institution emails are the official communication channel
- Matches the domain restriction feature (users authenticate with @jkkn.ac.in)
- More reliable for matching users

**Implementation Update Needed:**
```typescript
// Student matching - use college_email
const student = data.data.find(
  s => s.college_email?.toLowerCase() === email.toLowerCase()
);

// Staff matching - use institution_email
const staff = data.data.find(
  s => s.institution_email?.toLowerCase() === email.toLowerCase()
);
```

---

### Issue 2: We Don't Know if User is Student or Staff

#### The Challenge:
When a user logs in to fill a form, we only have their email address. We don't know if they are a student or staff member.

#### Current Strategy:
Try student endpoint first, then staff endpoint.

#### ❓ Questions to Answer:
1. **Is the current order optimal?** (Student first → Staff second)
2. **Should we try both in parallel?** (Faster but uses 2 API calls)
3. **Should we add a user type selector?** (Student/Staff toggle in form)

#### Option A: Sequential Search (Current)
```typescript
// Try student first
try {
  const studentProfile = await fetchStudentByEmail(email);
  if (studentProfile) return studentProfile;
} catch {}

// Then try staff
try {
  const staffProfile = await fetchStaffByEmail(email);
  if (staffProfile) return staffProfile;
} catch {}

throw new Error('Not found');
```

**Pros:**
- Only 1 API call if user is student (most common case)
- Simple logic
- No user input required

**Cons:**
- 2 API calls if user is staff
- Slower for staff members
- Assumes students are more common

#### Option B: Parallel Search
```typescript
// Try both simultaneously
const [studentResult, staffResult] = await Promise.allSettled([
  fetchStudentByEmail(email),
  fetchStaffByEmail(email)
]);

if (studentResult.status === 'fulfilled') return studentResult.value;
if (staffResult.status === 'fulfilled') return staffResult.value;

throw new Error('Not found');
```

**Pros:**
- Faster (single round trip)
- Fair to both students and staff
- No assumptions about user distribution

**Cons:**
- Always uses 2 API calls (higher load)
- Wastes one API call every time
- May hit rate limits faster

#### Option C: User Type Selector
Add a dropdown in the public form: "Are you a Student or Staff?"

**Pros:**
- Only 1 API call always
- User confirms their type
- Most efficient

**Cons:**
- Extra user input required
- User might select wrong option
- Less seamless experience

#### ✅ RECOMMENDED: Sequential with Smart Caching
1. **First submission**: Try student → then staff (save result to cache)
2. **Subsequent submissions**: Use cached user_type to try correct endpoint first
3. **Cache includes**: email → user_type mapping

**Benefits:**
- First submission: 1-2 API calls
- Future submissions: 1 API call always
- No user input needed
- Self-optimizing over time

---

### Issue 3: User Not Found in Both Endpoints

#### Scenarios:
1. User email doesn't exist in MYJKKN database
2. User is new (not yet added to system)
3. Email mismatch (typo, different domain)
4. API temporarily down

#### Current Behavior:
Throws error → Blocks form submission

#### ❓ What Should Happen?

#### Option A: Block Submission with Error
```typescript
if (!profile) {
  return NextResponse.json({
    error: 'Profile not found',
    message: 'Your email is not registered in MYJKKN system. Please contact admin.'
  }, { status: 404 });
}
```

**Pros:**
- Ensures only valid institutional users submit
- Data quality maintained
- Matches domain restriction philosophy

**Cons:**
- Blocks legitimate users (new students/staff)
- Creates support burden
- Poor user experience

#### Option B: Allow Submission with Warning
```typescript
if (!profile) {
  console.warn('Profile not found for:', email);
  // Continue with submission but log warning
  userProfile = null; // No profile attached
}
```

**Pros:**
- Doesn't block users
- Graceful degradation
- Form still collects responses

**Cons:**
- Loses institutional data for some responses
- Inconsistent analytics
- May allow non-institutional users

#### Option C: Manual Entry Fallback
```typescript
if (!profile) {
  // Show form fields for manual entry:
  // - Full Name
  // - Roll Number / Staff ID
  // - Department (dropdown from MYJKKN)
  // - Program / Category
}
```

**Pros:**
- Best user experience
- Still collects data
- User confirms their details

**Cons:**
- More complex UI
- Users might enter incorrect data
- Defeats purpose of auto-fetch

#### Option D: Smart Hybrid Approach (RECOMMENDED)
```typescript
// 1. Try auto-fetch
try {
  profile = await fetchProfile(email);
  // Success - auto-filled
} catch (error) {
  // 2. Check if form creator allows fallback
  if (form.allow_manual_entry_fallback) {
    // Show manual entry form
    showManualEntryFields = true;
  } else {
    // Block submission with helpful error
    return error('Email not found in MYJKKN. Contact admin.');
  }
}
```

**Configuration per Form:**
```typescript
interface PersonalForm {
  enable_user_autofetch: boolean;
  myjkkn_api_key: string;
  allow_manual_entry_fallback: boolean; // NEW FIELD
}
```

**Benefits:**
- Form creator controls behavior
- Flexible for different use cases
- Best of both worlds

---

## Proposed Email Field Structure (Need Confirmation)

### Student API Response (Expected):
```typescript
interface StudentResponse {
  data: [{
    id: string;
    first_name: string;
    last_name: string;
    roll_number: string;

    // ❓ CONFIRM: Which email fields exist?
    student_email: string;     // Personal email?
    college_email: string;     // Institutional email? ← USE THIS

    student_mobile: string;
    institution: { id: string; name: string };
    department: { id: string; department_name: string };
    program: { id: string; program_name: string };
    is_profile_complete: boolean;
  }];
}
```

### Staff API Response (Expected):
```typescript
interface StaffResponse {
  data: [{
    id: string;
    first_name: string;
    last_name: string;
    staff_id: string;

    // ❓ CONFIRM: Which email fields exist?
    email: string;               // Personal email?
    staff_email: string;         // Alternative name for same field?
    institution_email: string;   // Institutional email? ← USE THIS

    staff_mobile: string;
    institution: { id: string; name: string };
    department: { id: string; department_name: string };
    category: { id: string; name: string };
    is_active: boolean;
  }];
}
```

---

## Implementation Strategy

### Step 1: Verify Exact Field Names
**Action Required:** Test actual MYJKKN API endpoints to confirm:

```bash
# Student endpoint
curl "https://myjkkn-api-url/api/api-management/students?search=test@jkkn.ac.in" \
  -H "Authorization: Bearer YOUR_KEY"

# Staff endpoint
curl "https://myjkkn-api-url/api/api-management/staff?search=test@jkkn.ac.in" \
  -H "Authorization: Bearer YOUR_KEY"
```

**Check Response for:**
- Exact email field names
- Field types (string, nullable, etc.)
- Sample values

### Step 2: Update Type Definitions
Based on verification, update `types/personal-forms.ts`:

```typescript
export interface MYJKKNStudent {
  id: string;
  first_name: string;
  last_name: string;
  roll_number: string;
  college_email: string;          // ← UPDATED
  student_mobile: string | null;
  // ... rest
}

export interface MYJKKNStaff {
  id: string;
  first_name: string;
  last_name: string;
  staff_id: string;
  institution_email: string;      // ← UPDATED
  staff_mobile: string | null;
  // ... rest
}
```

### Step 3: Update API Service
Update `lib/services/myjkkn-api-service.ts`:

```typescript
private static async fetchStudentByEmail(
  email: string,
  apiKey: string
): Promise<UserProfile | null> {
  // ... API call code

  // UPDATED: Match using college_email
  const student = data.data.find(
    (s) => s.college_email?.toLowerCase() === email.toLowerCase()
  );

  if (!student) return null;

  // UPDATED: Store college_email
  return {
    user_type: 'student',
    email: student.college_email,  // ← Use institutional email
    // ... rest
  };
}

private static async fetchStaffByEmail(
  email: string,
  apiKey: string
): Promise<UserProfile | null> {
  // ... API call code

  // UPDATED: Match using institution_email
  const staff = data.data.find(
    (s) => s.institution_email?.toLowerCase() === email.toLowerCase()
  );

  if (!staff) return null;

  // UPDATED: Store institution_email
  return {
    user_type: 'staff',
    email: staff.institution_email,  // ← Use institutional email
    // ... rest
  };
}
```

### Step 4: Add Smart Fallback
Update form submission to handle "not found":

```typescript
// In responses/route.ts
try {
  userProfile = await MYJKKNApiService.getUserProfile(email, apiKey);
  console.log('✅ Profile auto-fetched:', userProfile.full_name);
} catch (error) {
  console.warn('⚠️ Profile not found in MYJKKN for:', email);

  // Check if form allows fallback
  if (form.allow_manual_entry_fallback) {
    // Allow submission without profile
    userProfile = null;
  } else {
    // Block submission with helpful error
    return NextResponse.json({
      error: 'Email Not Registered',
      message: `Your email (${email}) was not found in the MYJKKN system. Please ensure you're using your institutional email (@jkkn.ac.in) or contact the administrator.`,
      code: 'PROFILE_NOT_FOUND'
    }, { status: 404 });
  }
}
```

---

## Questions for User

### 1. Email Fields Confirmation
**Can you confirm the exact email field names in the API response?**
- Student: `college_email` or different name?
- Staff: `institution_email` or different name?

### 2. Search Strategy
**Which search strategy do you prefer?**
- A. Sequential (Student → Staff) - Simple, 1-2 API calls
- B. Parallel (Both at once) - Faster, always 2 API calls
- C. User selector (Ask user first) - Most efficient, extra input

**Recommendation:** Sequential with caching

### 3. Not Found Handling
**What should happen when user email is not found?**
- A. Block submission with error message
- B. Allow submission without profile (graceful degradation)
- C. Show manual entry form as fallback
- D. Configurable per form (recommended)

### 4. API Testing
**Can you provide:**
- MYJKKN API base URL
- Sample API key (for testing)
- Sample student email (for verification)
- Sample staff email (for verification)

This will allow us to test the actual API responses and verify field names.

---

## Next Steps

1. ✅ **User confirms email field names** (college_email, institution_email)
2. ✅ **User chooses search strategy** (Sequential recommended)
3. ✅ **User decides on not-found handling** (Configurable recommended)
4. 🔨 **Update TypeScript types** with confirmed field names
5. 🔨 **Update API service** to use correct email fields
6. 🔨 **Add fallback logic** based on user decision
7. 🔨 **Add configuration fields** to personal_forms table
8. 🧪 **Test with real API** using provided credentials

---

## Recommended Configuration

Based on best practices, here's what I recommend:

```typescript
// Updated PersonalForm interface
interface PersonalForm {
  // ... existing fields

  enable_user_autofetch: boolean;
  myjkkn_api_key: string;

  // NEW: Fallback configuration
  require_institutional_profile: boolean;  // If true, block non-MYJKKN users
  allow_manual_entry_fallback: boolean;    // If true, show manual form when not found
}
```

**Settings Page UI:**
```
[x] Enable User Profile Auto-Fetch

API Key: [********************]

⚙️ Auto-Fetch Settings:
[x] Require MYJKKN Profile (block submissions from non-registered users)
[ ] Allow Manual Entry Fallback (let users enter details if not found)

ℹ️ If "Require MYJKKN Profile" is enabled and user is not found,
   they will see an error and cannot submit the form.
```

---

**Please confirm the email field names and preferred strategies before I update the implementation!**
