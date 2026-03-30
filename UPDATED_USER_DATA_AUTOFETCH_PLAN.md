# Updated User Data Auto-Fetch Implementation Plan
## Based on Actual MYJKKN API Structure

---

## **Key Findings from API Analysis**

### **Student API:**
- **Endpoint:** `/api/api-management/students`
- **Auth:** `Authorization: Bearer ${apiKey}`
- **Method:** GET with filters (no direct email lookup endpoint)
- **Search:** Use `search` parameter with email to find student

**Response Structure:**
```json
{
  "data": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "roll_number": "21CS101",
      "student_email": "john@jkkn.ac.in",
      "student_mobile": "9876543210",
      "institution": { "id": "uuid", "name": "JKKN College" },
      "department": { "id": "uuid", "department_name": "CSE" },
      "program": { "id": "uuid", "program_name": "B.E Computer Science" },
      "is_profile_complete": true
    }
  ],
  "metadata": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

### **Staff API:**
- **Endpoint:** `/api/api-management/staff`
- **Auth:** `Authorization: Bearer ${apiKey}`
- **Filters:** page, limit, search, institution_id, department_id, category_id, is_active

**Expected Response (similar structure):**
```json
{
  "data": [
    {
      "id": "uuid",
      "first_name": "Jane",
      "last_name": "Smith",
      "staff_id": "STAFF001",
      "staff_email": "jane@jkkn.ac.in",
      "staff_mobile": "9876543210",
      "institution": { "id": "uuid", "name": "JKKN College" },
      "department": { "id": "uuid", "department_name": "CSE" },
      "category": { "id": "uuid", "name": "Professor" },
      "is_active": true
    }
  ],
  "metadata": { ... }
}
```

---

## **Updated Architecture**

### **Simplified Data Model**
We'll extract only **essential fields** from the API:

```typescript
interface UserProfile {
  // Basic Identity
  user_type: 'student' | 'staff';
  id: string;
  full_name: string;  // Concatenated first_name + last_name
  email: string;
  mobile: string;

  // Institutional Data
  institution_name: string;
  department_name: string;

  // Type-specific
  identifier: string;  // roll_number (student) or staff_id (staff)
  additional_info: string; // program_name (student) or category (staff)

  // Status
  is_active: boolean; // is_profile_complete (student) or is_active (staff)
}
```

---

## **Updated Implementation Phases**

### **Phase 1: Database Schema (Simplified)**

#### **1.1 User Profile Cache Table**
```sql
-- Migration: add_user_profile_cache.sql
CREATE TABLE IF NOT EXISTS user_profile_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,

  -- User Type
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'staff')),

  -- Basic Profile Data (simplified)
  profile_data JSONB NOT NULL,

  -- Extracted for easy querying
  full_name TEXT NOT NULL,
  identifier TEXT, -- roll_number or staff_id
  institution_name TEXT,
  department_name TEXT,
  additional_info TEXT, -- program or category
  is_active BOOLEAN DEFAULT TRUE,

  -- Cache metadata
  source TEXT NOT NULL DEFAULT 'myjkkn_api',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profile_cache_email ON user_profile_cache(email);
CREATE INDEX idx_user_profile_cache_department ON user_profile_cache(department_name);
CREATE INDEX idx_user_profile_cache_user_type ON user_profile_cache(user_type);
```

#### **1.2 Add User Profile to Responses** (Same as before)
```sql
ALTER TABLE personal_form_responses
ADD COLUMN IF NOT EXISTS user_profile JSONB;

CREATE INDEX idx_personal_form_responses_user_profile
ON personal_form_responses USING GIN (user_profile);
```

#### **1.3 Add Auto-Fetch Settings to Forms** (Same as before)
```sql
ALTER TABLE personal_forms
ADD COLUMN IF NOT EXISTS enable_user_autofetch BOOLEAN DEFAULT FALSE;
```

---

### **Phase 2: Backend Implementation**

#### **2.1 Environment Variables**
```env
# MYJKKN API Configuration
MYJKKN_API_BASE_URL=https://jkkn.ai
MYJKKN_API_KEY=your-bearer-token-here
MYJKKN_API_TIMEOUT=10000
MYJKKN_CACHE_DURATION=86400000  # 24 hours
```

#### **2.2 MYJKKN API Service (Updated)**
Create `lib/services/external/myjkkn-api-service.ts`:

```typescript
export interface MYJKKNUserProfile {
  user_type: 'student' | 'staff';
  id: string;
  full_name: string;
  email: string;
  mobile: string;
  institution_name: string;
  department_name: string;
  identifier: string; // roll_number or staff_id
  additional_info: string; // program or category
  is_active: boolean;
}

interface StudentResponse {
  data: Array<{
    id: string;
    first_name: string;
    last_name: string | null;
    roll_number: string;
    student_email: string;
    student_mobile: string;
    institution: { id: string; name: string };
    department: { id: string; department_name: string };
    program: { id: string; program_name: string };
    is_profile_complete: boolean;
  }>;
  metadata: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface StaffResponse {
  data: Array<{
    id: string;
    first_name: string;
    last_name: string | null;
    staff_id: string;
    staff_email: string;
    staff_mobile: string;
    institution: { id: string; name: string };
    department: { id: string; department_name: string };
    category: { id: string; name: string };
    is_active: boolean;
  }>;
  metadata: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class MYJKKNApiService {
  private static baseUrl = process.env.MYJKKN_API_BASE_URL!;
  private static apiKey = process.env.MYJKKN_API_KEY!;
  private static timeout = parseInt(process.env.MYJKKN_API_TIMEOUT || '10000');

  /**
   * Fetch user profile by email (tries both student and staff endpoints)
   */
  static async fetchUserProfile(email: string): Promise<MYJKKNUserProfile> {
    // Try student endpoint first
    try {
      const studentProfile = await this.fetchStudentByEmail(email);
      if (studentProfile) return studentProfile;
    } catch (error) {
      console.log('Not found in students, trying staff...');
    }

    // Try staff endpoint
    try {
      const staffProfile = await this.fetchStaffByEmail(email);
      if (staffProfile) return staffProfile;
    } catch (error) {
      console.log('Not found in staff');
    }

    throw new Error('User profile not found in MYJKKN database');
  }

  /**
   * Fetch student by email using search parameter
   */
  private static async fetchStudentByEmail(
    email: string
  ): Promise<MYJKKNUserProfile | null> {
    const url = new URL(`${this.baseUrl}/api/api-management/students`);
    url.searchParams.append('search', email);
    url.searchParams.append('limit', '1');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Student API Error: ${response.status}`);
      }

      const data: StudentResponse = await response.json();

      if (!data.data || data.data.length === 0) {
        return null;
      }

      // Filter exact email match (search might return partial matches)
      const student = data.data.find(
        s => s.student_email.toLowerCase() === email.toLowerCase()
      );

      if (!student) return null;

      // Transform to unified format
      return {
        user_type: 'student',
        id: student.id,
        full_name: `${student.first_name} ${student.last_name || ''}`.trim(),
        email: student.student_email,
        mobile: student.student_mobile,
        institution_name: student.institution?.name || '',
        department_name: student.department?.department_name || '',
        identifier: student.roll_number,
        additional_info: student.program?.program_name || '',
        is_active: student.is_profile_complete
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout while fetching student data');
      }
      throw error;
    }
  }

  /**
   * Fetch staff by email using search parameter
   */
  private static async fetchStaffByEmail(
    email: string
  ): Promise<MYJKKNUserProfile | null> {
    const url = new URL(`${this.baseUrl}/api/api-management/staff`);
    url.searchParams.append('search', email);
    url.searchParams.append('limit', '1');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Staff API Error: ${response.status}`);
      }

      const data: StaffResponse = await response.json();

      if (!data.data || data.data.length === 0) {
        return null;
      }

      // Filter exact email match
      const staff = data.data.find(
        s => s.staff_email.toLowerCase() === email.toLowerCase()
      );

      if (!staff) return null;

      // Transform to unified format
      return {
        user_type: 'staff',
        id: staff.id,
        full_name: `${staff.first_name} ${staff.last_name || ''}`.trim(),
        email: staff.staff_email,
        mobile: staff.staff_mobile,
        institution_name: staff.institution?.name || '',
        department_name: staff.department?.department_name || '',
        identifier: staff.staff_id,
        additional_info: staff.category?.name || '',
        is_active: staff.is_active
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout while fetching staff data');
      }
      throw error;
    }
  }

  /**
   * Verify if email exists in MYJKKN (checks both student and staff)
   */
  static async verifyUserEmail(email: string): Promise<boolean> {
    try {
      await this.fetchUserProfile(email);
      return true;
    } catch {
      return false;
    }
  }
}
```

#### **2.3 Profile Cache Service (Updated)**
Create `lib/services/user-profile-cache-service.ts`:

```typescript
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { MYJKKNUserProfile, MYJKKNApiService } from './external/myjkkn-api-service';

export interface CachedUserProfile extends MYJKKNUserProfile {
  cachedAt: string;
  expiresAt: string;
  source: string;
}

export class UserProfileCacheService {
  private static cacheDuration = parseInt(
    process.env.MYJKKN_CACHE_DURATION || '86400000'
  ); // 24 hours

  /**
   * Get user profile with caching
   */
  static async getUserProfile(
    email: string,
    forceRefresh: boolean = false
  ): Promise<CachedUserProfile> {
    const supabase = createClientSupabaseClient();

    if (!forceRefresh) {
      const cached = await this.getFromCache(email);
      if (cached && !this.isCacheExpired(cached)) {
        console.log('[Cache] Returning cached profile for:', email);
        return cached;
      }
    }

    console.log('[API] Fetching fresh profile from MYJKKN for:', email);
    const profile = await MYJKKNApiService.fetchUserProfile(email);

    await this.saveToCache(email, profile);

    const now = new Date();
    return {
      ...profile,
      cachedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.cacheDuration).toISOString(),
      source: 'myjkkn_api'
    };
  }

  /**
   * Get profile from cache
   */
  private static async getFromCache(
    email: string
  ): Promise<CachedUserProfile | null> {
    const supabase = createClientSupabaseClient();

    const { data, error } = await supabase
      .from('user_profile_cache')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) return null;

    return {
      user_type: data.user_type,
      id: data.profile_data.id,
      full_name: data.full_name,
      email: data.email,
      mobile: data.profile_data.mobile,
      institution_name: data.institution_name,
      department_name: data.department_name,
      identifier: data.identifier,
      additional_info: data.additional_info,
      is_active: data.is_active,
      cachedAt: data.fetched_at,
      expiresAt: data.expires_at,
      source: data.source
    };
  }

  /**
   * Save profile to cache
   */
  private static async saveToCache(
    email: string,
    profile: MYJKKNUserProfile
  ): Promise<void> {
    const supabase = createClientSupabaseClient();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.cacheDuration);

    await supabase.from('user_profile_cache').upsert(
      {
        email,
        user_type: profile.user_type,
        profile_data: profile,
        full_name: profile.full_name,
        identifier: profile.identifier,
        institution_name: profile.institution_name,
        department_name: profile.department_name,
        additional_info: profile.additional_info,
        is_active: profile.is_active,
        source: 'myjkkn_api',
        fetched_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      },
      { onConflict: 'email' }
    );
  }

  private static isCacheExpired(profile: CachedUserProfile): boolean {
    return new Date(profile.expiresAt) < new Date();
  }

  static async clearCache(email: string): Promise<void> {
    const supabase = createClientSupabaseClient();
    await supabase.from('user_profile_cache').delete().eq('email', email);
  }
}
```

#### **2.4 API Route - Fetch User Profile**
Create `app/api/user-profile/fetch/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/auth/with-auth-api';
import { UserProfileCacheService } from '@/lib/services/user-profile-cache-service';

export const POST = withAuthApi(async (req, context, session) => {
  try {
    const user = session!.user;
    const { email, forceRefresh } = await req.json();

    // Security: Users can only fetch their own profile
    // (unless they're admin - we can add that check later)
    if (email !== user.email) {
      return NextResponse.json(
        { error: 'Unauthorized to fetch other user profiles' },
        { status: 403 }
      );
    }

    const profile = await UserProfileCacheService.getUserProfile(
      email,
      forceRefresh || false
    );

    return NextResponse.json({
      success: true,
      profile,
      cached: !forceRefresh
    });
  } catch (error: any) {
    console.error('[API] Error fetching user profile:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user profile',
        message: error.message
      },
      { status: error.message.includes('not found') ? 404 : 500 }
    );
  }
});
```

#### **2.5 Update Response Submission**
Update `app/api/personal-forms/[formId]/responses/route.ts`:

```typescript
// Add import
import { UserProfileCacheService } from '@/lib/services/user-profile-cache-service';

// After domain validation, before submission:
let userProfile = null;

if (form.enable_user_autofetch && submissionEmail) {
  try {
    console.log('[Auto-fetch] Fetching profile for:', submissionEmail);
    const profile = await UserProfileCacheService.getUserProfile(submissionEmail);

    // Simplified profile for storage
    userProfile = {
      user_type: profile.user_type,
      full_name: profile.full_name,
      identifier: profile.identifier,
      department: profile.department_name,
      institution: profile.institution_name,
      additional_info: profile.additional_info
    };

    console.log('[Auto-fetch] Profile attached:', userProfile);
  } catch (error) {
    console.error('[Auto-fetch] Failed to fetch profile:', error);
    // Don't block submission if profile fetch fails
  }
}

// In insert:
const { data: response, error: insertError } = await supabase
  .from('personal_form_responses')
  .insert({
    personal_form_id: formId,
    submission_id: submissionId,
    response_data: body.response_data,
    user_email: submissionEmail,
    user_profile: userProfile, // Attach profile
    is_anonymous: body.is_anonymous ?? true,
    submitted_by: null
  })
  .select()
  .single();
```

---

### **Phase 3: Frontend Implementation**

#### **3.1 Update Types**
```typescript
// types/personal-forms.ts
export interface PersonalFormResponse {
  // ... existing fields

  user_profile?: {
    user_type: 'student' | 'staff';
    full_name: string;
    identifier: string; // roll_number or staff_id
    department: string;
    institution: string;
    additional_info: string; // program or category
  };
}
```

#### **3.2 UserProfileCard Component**
Create `components/personal-forms/user-profile-card.tsx`:

```typescript
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Building2, GraduationCap, Briefcase, IdCard } from 'lucide-react';

interface UserProfileCardProps {
  profile: {
    user_type: 'student' | 'staff';
    full_name: string;
    identifier: string;
    department: string;
    institution: string;
    additional_info: string;
  };
}

export function UserProfileCard({ profile }: UserProfileCardProps) {
  const isStudent = profile.user_type === 'student';

  return (
    <Card className='border-blue-200 bg-blue-50 dark:bg-blue-950/20'>
      <CardContent className='pt-6'>
        <div className='flex items-start gap-4'>
          <div className='rounded-full bg-blue-100 dark:bg-blue-900 p-3'>
            {isStudent ? (
              <GraduationCap className='h-6 w-6 text-blue-600 dark:text-blue-400' />
            ) : (
              <Briefcase className='h-6 w-6 text-blue-600 dark:text-blue-400' />
            )}
          </div>

          <div className='flex-1 space-y-3'>
            <div>
              <h3 className='text-lg font-semibold text-blue-900 dark:text-blue-100'>
                {profile.full_name}
              </h3>
              <p className='text-sm text-blue-700 dark:text-blue-300'>
                {isStudent ? 'Roll No' : 'Staff ID'}: {profile.identifier}
              </p>
            </div>

            <div className='grid grid-cols-1 gap-2'>
              <div className='flex items-center gap-2 text-sm'>
                <Building2 className='h-4 w-4 text-blue-600' />
                <span className='text-blue-800 dark:text-blue-200'>
                  {profile.department}
                </span>
              </div>

              <div className='flex items-center gap-2 text-sm'>
                <IdCard className='h-4 w-4 text-blue-600' />
                <span className='text-blue-800 dark:text-blue-200'>
                  {profile.additional_info}
                </span>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Badge variant='outline' className='bg-white dark:bg-gray-800'>
                Auto-filled from MYJKKN
              </Badge>
              <Badge variant='secondary'>
                {isStudent ? 'Student' : 'Staff'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### **3.3 Update Public Form Page**
Same as original plan, but using simplified profile structure.

---

### **Phase 4: Analytics Updates**

#### **4.1 Simplified Analytics**
Only track by:
- **Department** (both student & staff)
- **User Type** (student vs staff breakdown)
- **Additional Info** (program for students, category for staff)

Update `lib/services/personal-form-analytics-service.ts`:

```typescript
static async getResponsesByDepartment(formId: string, supabaseClient?: any) {
  const supabase = supabaseClient || createClientSupabaseClient();

  const { data, error } = await supabase
    .from('personal_form_responses')
    .select('user_profile')
    .eq('personal_form_id', formId)
    .not('user_profile', 'is', null);

  if (error) throw error;

  const deptCounts: Record<string, number> = {};

  data.forEach((response: any) => {
    const dept = response.user_profile?.department || 'Unknown';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  return Object.entries(deptCounts)
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);
}

static async getResponsesByUserType(formId: string, supabaseClient?: any) {
  const supabase = supabaseClient || createClientSupabaseClient();

  const { data, error } = await supabase
    .from('personal_form_responses')
    .select('user_profile')
    .eq('personal_form_id', formId)
    .not('user_profile', 'is', null);

  if (error) throw error;

  const counts = { student: 0, staff: 0, unknown: 0 };

  data.forEach((response: any) => {
    const type = response.user_profile?.user_type || 'unknown';
    counts[type as keyof typeof counts]++;
  });

  return [
    { type: 'Students', count: counts.student },
    { type: 'Staff', count: counts.staff },
    { type: 'Unknown', count: counts.unknown }
  ];
}
```

---

## **Key Changes from Original Plan**

### **✅ Simplified:**
1. **No separate student/staff tables** - unified profile cache
2. **Basic fields only** - name, department, identifier, institution
3. **Search-based fetch** - uses existing list endpoints with email search
4. **Unified response structure** - same format for both student/staff

### **✅ API Integration:**
1. Uses actual `Authorization: Bearer` auth
2. Searches both student and staff endpoints
3. Handles paginated responses
4. Maps different field names to unified structure

### **✅ Error Handling:**
1. Falls back gracefully if profile not found
2. Doesn't block form submission
3. Caches results to reduce API calls
4. Timeout protection (10 seconds)

---

## **Testing Checklist**

- [ ] Student profile fetch by email works
- [ ] Staff profile fetch by email works
- [ ] Cache stores and retrieves correctly
- [ ] Form submission includes profile when enabled
- [ ] Analytics show department breakdown
- [ ] User type analytics work (student vs staff)
- [ ] Export includes profile data
- [ ] Graceful fallback when API fails

---

## **Timeline (Updated)**

- **Phase 1 (Database):** 1-2 hours
- **Phase 2 (Backend API):** 3-4 hours
- **Phase 3 (Frontend):** 2-3 hours
- **Phase 4 (Analytics):** 1-2 hours
- **Testing:** 2 hours

**Total:** 9-13 hours

---

**Ready to implement with actual MYJKKN API structure!** 🚀
