# User Data Auto-Fetch Feature - Implementation Plan

## **Overview**
Integrate MYJKKN application API to automatically fetch user personal details (name, institution, department, student ID, etc.) based on their email when they access domain-restricted forms. This eliminates redundant data collection in individual forms and enriches analytics with institutional data.

---

## **Problem Statement**

### **Current Limitations:**
1. ❌ Users must fill personal details (name, department, student ID) in every form
2. ❌ Redundant data collection across multiple forms
3. ❌ Data inconsistency (users might enter different info)
4. ❌ Poor user experience (repetitive form filling)
5. ❌ Analytics lack institutional context (department, year, course)

### **Proposed Solution:**
When a user with `@jkkn.ac.in` email logs in:
1. ✅ Fetch their profile from MYJKKN API using their email
2. ✅ Auto-attach personal details to form submission
3. ✅ Display pre-filled user info (name, department) on form
4. ✅ Enrich analytics with institutional data
5. ✅ No need to add name/department fields to forms

---

## **Architecture Design**

### **Data Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│ 1. User accesses form with domain restriction enabled       │
│    (e.g., only @jkkn.ac.in allowed)                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. User authenticates with @jkkn.ac.in email                │
│    Form validates domain access                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Frontend calls /api/user-profile/fetch                   │
│    Sends: { email: "student@jkkn.ac.in" }                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Backend calls MYJKKN API with API key                    │
│    GET https://myjkkn.app/api/student/profile?email=...     │
│    Headers: { "X-API-Key": "your-api-key" }                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. MYJKKN API returns student profile:                      │
│    {                                                         │
│      student_id: "21CS101",                                  │
│      full_name: "John Doe",                                  │
│      email: "student@jkkn.ac.in",                            │
│      department: "Computer Science",                         │
│      year: 3,                                                │
│      course: "B.E CSE",                                      │
│      institution: "JKKN College of Engineering"             │
│    }                                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Cache profile data in session/state                      │
│    Display on form: "Logged in as: John Doe (21CS101)"      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. User fills only form-specific fields                     │
│    (e.g., feedback, preferences, ratings)                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. On submission, merge form data + profile data:           │
│    {                                                         │
│      response_data: { feedback: "Great event!" },            │
│      user_profile: { student_id, name, department, ... },    │
│      submitted_by: user_id,                                  │
│      user_email: "student@jkkn.ac.in"                        │
│    }                                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. Analytics enriched with institutional data:              │
│    - Responses by Department                                 │
│    - Responses by Year/Course                                │
│    - Student ID tracking                                     │
│    - Institution-wide insights                               │
└─────────────────────────────────────────────────────────────┘
```

---

## **Implementation Phases**

### **Phase 1: Database Schema Updates**

#### **1.1 Add User Profile Cache Table**
Store fetched profiles to reduce API calls.

```sql
-- Migration: add_user_profile_cache.sql
CREATE TABLE IF NOT EXISTS user_profile_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  profile_data JSONB NOT NULL,
  source TEXT NOT NULL, -- 'myjkkn_api' or 'manual'

  -- Profile fields (extracted for easy querying)
  student_id TEXT,
  full_name TEXT,
  department TEXT,
  year INTEGER,
  course TEXT,
  institution TEXT,

  -- Cache metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = never expires
  is_verified BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast email lookup
CREATE INDEX idx_user_profile_cache_email ON user_profile_cache(email);

-- Index for analytics queries
CREATE INDEX idx_user_profile_cache_department ON user_profile_cache(department);
CREATE INDEX idx_user_profile_cache_institution ON user_profile_cache(institution);
```

#### **1.2 Add User Profile to Form Responses**
```sql
-- Migration: add_user_profile_to_responses.sql
ALTER TABLE personal_form_responses
ADD COLUMN IF NOT EXISTS user_profile JSONB;

-- Index for analytics
CREATE INDEX idx_personal_form_responses_user_profile
ON personal_form_responses USING GIN (user_profile);

COMMENT ON COLUMN personal_form_responses.user_profile IS
'Auto-fetched user profile data from MYJKKN API (student_id, name, department, etc.)';
```

#### **1.3 Add API Configuration Table**
```sql
-- Migration: add_api_configuration.sql
CREATE TABLE IF NOT EXISTS api_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'myjkkn_api'
  base_url TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL, -- Encrypted API key
  is_active BOOLEAN DEFAULT TRUE,

  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,

  -- Endpoints configuration
  endpoints JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- Example: { "fetchProfile": "/api/student/profile" }

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert MYJKKN API config
INSERT INTO api_configurations (name, base_url, api_key_encrypted, endpoints)
VALUES (
  'myjkkn_api',
  'https://myjkkn.app',
  'ENCRYPTED_API_KEY_HERE', -- Will be encrypted using crypto
  '{
    "fetchProfile": "/api/student/profile",
    "verifyStudent": "/api/student/verify"
  }'::JSONB
);
```

#### **1.4 Add Auto-Fetch Settings to Personal Forms**
```sql
-- Migration: add_autofetch_to_personal_forms.sql
ALTER TABLE personal_forms
ADD COLUMN IF NOT EXISTS enable_user_autofetch BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS autofetch_source TEXT DEFAULT 'myjkkn_api',
ADD COLUMN IF NOT EXISTS autofetch_config JSONB DEFAULT '{}'::JSONB;

COMMENT ON COLUMN personal_forms.enable_user_autofetch IS
'Enable automatic user profile fetching from external API';

COMMENT ON COLUMN personal_forms.autofetch_source IS
'Source API for user data (myjkkn_api, etc.)';

COMMENT ON COLUMN personal_forms.autofetch_config IS
'Configuration for auto-fetch (cache duration, fallback behavior, etc.)';
```

---

### **Phase 2: Backend API Implementation**

#### **2.1 Environment Variables**
Add to `.env`:
```env
# MYJKKN API Integration
MYJKKN_API_BASE_URL=https://myjkkn.app
MYJKKN_API_KEY=your-secret-api-key-here
MYJKKN_API_TIMEOUT=5000
MYJKKN_CACHE_DURATION=86400000  # 24 hours in ms
```

#### **2.2 API Service Layer**
Create `lib/services/external/myjkkn-api-service.ts`:

```typescript
import { createHash } from 'crypto';

export interface MYJKKNStudentProfile {
  student_id: string;
  full_name: string;
  email: string;
  department: string;
  year: number;
  course: string;
  institution: string;
  phone?: string;
  roll_number?: string;
  batch?: string;
}

export class MYJKKNApiService {
  private static baseUrl = process.env.MYJKKN_API_BASE_URL!;
  private static apiKey = process.env.MYJKKN_API_KEY!;
  private static timeout = parseInt(process.env.MYJKKN_API_TIMEOUT || '5000');

  /**
   * Fetch student profile from MYJKKN API
   */
  static async fetchStudentProfile(email: string): Promise<MYJKKNStudentProfile> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(
        `${this.baseUrl}/api/student/profile?email=${encodeURIComponent(email)}`,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformProfile(data);
    } catch (error) {
      console.error('MYJKKN API Error:', error);
      throw new Error('Failed to fetch student profile from MYJKKN');
    }
  }

  /**
   * Transform API response to standard format
   */
  private static transformProfile(data: any): MYJKKNStudentProfile {
    return {
      student_id: data.student_id || data.studentId,
      full_name: data.full_name || data.name,
      email: data.email,
      department: data.department || data.dept,
      year: parseInt(data.year || data.current_year),
      course: data.course || data.program,
      institution: data.institution || 'JKKN College of Engineering',
      phone: data.phone,
      roll_number: data.roll_number || data.rollNo,
      batch: data.batch
    };
  }

  /**
   * Verify student email exists in MYJKKN database
   */
  static async verifyStudentEmail(email: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(
        `${this.baseUrl}/api/student/verify?email=${encodeURIComponent(email)}`,
        {
          headers: {
            'X-API-Key': this.apiKey
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) return false;

      const data = await response.json();
      return data.exists === true;
    } catch (error) {
      console.error('MYJKKN Verify Error:', error);
      return false;
    }
  }
}
```

#### **2.3 Profile Cache Service**
Create `lib/services/user-profile-cache-service.ts`:

```typescript
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { MYJKKNStudentProfile, MYJKKNApiService } from './external/myjkkn-api-service';

export interface CachedUserProfile extends MYJKKNStudentProfile {
  cachedAt: string;
  expiresAt: string | null;
  source: string;
}

export class UserProfileCacheService {
  private static cacheDuration = parseInt(
    process.env.MYJKKN_CACHE_DURATION || '86400000'
  ); // 24 hours

  /**
   * Get user profile with caching
   * 1. Check cache first
   * 2. If expired or not found, fetch from API
   * 3. Update cache
   */
  static async getUserProfile(
    email: string,
    forceRefresh: boolean = false
  ): Promise<CachedUserProfile> {
    const supabase = createClientSupabaseClient();

    if (!forceRefresh) {
      // Try to get from cache
      const cached = await this.getFromCache(email);
      if (cached && !this.isCacheExpired(cached)) {
        console.log('Returning cached profile for:', email);
        return cached;
      }
    }

    // Fetch from API
    console.log('Fetching fresh profile from MYJKKN API for:', email);
    const profile = await MYJKKNApiService.fetchStudentProfile(email);

    // Save to cache
    await this.saveToCache(email, profile);

    return {
      ...profile,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.cacheDuration).toISOString(),
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
      student_id: data.student_id,
      full_name: data.full_name,
      email: data.email,
      department: data.department,
      year: data.year,
      course: data.course,
      institution: data.institution,
      phone: data.profile_data?.phone,
      roll_number: data.profile_data?.roll_number,
      batch: data.profile_data?.batch,
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
    profile: MYJKKNStudentProfile
  ): Promise<void> {
    const supabase = createClientSupabaseClient();

    const expiresAt = new Date(Date.now() + this.cacheDuration);

    await supabase
      .from('user_profile_cache')
      .upsert({
        email,
        profile_data: profile,
        student_id: profile.student_id,
        full_name: profile.full_name,
        department: profile.department,
        year: profile.year,
        course: profile.course,
        institution: profile.institution,
        source: 'myjkkn_api',
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        is_verified: true
      });
  }

  /**
   * Check if cache is expired
   */
  private static isCacheExpired(profile: CachedUserProfile): boolean {
    if (!profile.expiresAt) return false; // Never expires
    return new Date(profile.expiresAt) < new Date();
  }

  /**
   * Clear cache for specific user
   */
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

    // Security: Only allow fetching own profile or authorized users
    if (email !== user.email) {
      // Check if user has admin role
      const { createServerSupabaseClient } = await import('@/lib/supabase/server');
      const supabase = await createServerSupabaseClient();

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = ['super_admin', 'administrator', 'institution_coordinator'].includes(
        profile?.role || ''
      );

      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized to fetch other user profiles' },
          { status: 403 }
        );
      }
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
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user profile',
        message: error.message
      },
      { status: 500 }
    );
  }
});
```

#### **2.5 Update Response Submission to Include User Profile**
Update `app/api/personal-forms/[formId]/responses/route.ts`:

```typescript
// Add import
import { UserProfileCacheService } from '@/lib/services/user-profile-cache-service';

// In POST handler, after domain validation:
let userProfile = null;

// Check if form has auto-fetch enabled
if (form.enable_user_autofetch && submissionEmail) {
  try {
    const profile = await UserProfileCacheService.getUserProfile(submissionEmail);
    userProfile = {
      student_id: profile.student_id,
      full_name: profile.full_name,
      department: profile.department,
      year: profile.year,
      course: profile.course,
      institution: profile.institution
    };
    console.log('Auto-fetched user profile:', userProfile);
  } catch (error) {
    console.error('Failed to auto-fetch user profile:', error);
    // Continue without profile - don't block submission
  }
}

// When creating response:
const { data: response, error: insertError } = await supabase
  .from('personal_form_responses')
  .insert({
    personal_form_id: formId,
    submission_id: submissionId,
    response_data: body.response_data,
    user_email: submissionEmail,
    user_profile: userProfile, // NEW: Attach profile data
    is_anonymous: body.is_anonymous ?? true,
    submitted_by: null
  })
  .select()
  .single();
```

---

### **Phase 3: Frontend Implementation**

#### **3.1 Update Personal Form Type**
Update `types/personal-forms.ts`:

```typescript
export interface PersonalForm {
  // ... existing fields

  // NEW: User auto-fetch settings
  enable_user_autofetch?: boolean;
  autofetch_source?: string;
  autofetch_config?: {
    showProfileCard?: boolean;
    cacheDuration?: number;
    fallbackBehavior?: 'allow' | 'block';
  };
}

export interface PersonalFormResponse {
  // ... existing fields

  // NEW: Auto-fetched user profile
  user_profile?: {
    student_id: string;
    full_name: string;
    department: string;
    year: number;
    course: string;
    institution: string;
  };
}
```

#### **3.2 Create UserProfileCard Component**
Create `components/personal-forms/user-profile-card.tsx`:

```typescript
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, GraduationCap, Building2, Calendar } from 'lucide-react';

interface UserProfileCardProps {
  profile: {
    student_id: string;
    full_name: string;
    department: string;
    year: number;
    course: string;
    institution: string;
  };
}

export function UserProfileCard({ profile }: UserProfileCardProps) {
  return (
    <Card className='border-blue-200 bg-blue-50 dark:bg-blue-950/20'>
      <CardContent className='pt-6'>
        <div className='flex items-start gap-4'>
          <div className='rounded-full bg-blue-100 dark:bg-blue-900 p-3'>
            <User className='h-6 w-6 text-blue-600 dark:text-blue-400' />
          </div>

          <div className='flex-1 space-y-3'>
            <div>
              <h3 className='text-lg font-semibold text-blue-900 dark:text-blue-100'>
                {profile.full_name}
              </h3>
              <p className='text-sm text-blue-700 dark:text-blue-300'>
                Student ID: {profile.student_id}
              </p>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              <div className='flex items-center gap-2 text-sm'>
                <Building2 className='h-4 w-4 text-blue-600' />
                <span className='text-blue-800 dark:text-blue-200'>
                  {profile.department}
                </span>
              </div>

              <div className='flex items-center gap-2 text-sm'>
                <GraduationCap className='h-4 w-4 text-blue-600' />
                <span className='text-blue-800 dark:text-blue-200'>
                  {profile.course}
                </span>
              </div>

              <div className='flex items-center gap-2 text-sm'>
                <Calendar className='h-4 w-4 text-blue-600' />
                <span className='text-blue-800 dark:text-blue-200'>
                  Year {profile.year}
                </span>
              </div>
            </div>

            <div className='pt-2'>
              <Badge variant='outline' className='bg-white dark:bg-gray-800'>
                Auto-filled from MYJKKN
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
Update `app/forms/public/personal/[formId]/page.tsx`:

```typescript
// Add state
const [userProfile, setUserProfile] = useState<any>(null);
const [profileLoading, setProfileLoading] = useState(false);

// Add effect to fetch user profile when email is available
useEffect(() => {
  async function fetchUserProfile() {
    if (!userEmail || !form?.enable_user_autofetch) return;

    setProfileLoading(true);
    try {
      const response = await fetch('/api/user-profile/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.profile);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }

  fetchUserProfile();
}, [userEmail, form?.enable_user_autofetch]);

// In JSX, after form header, before form fields:
{userProfile && (
  <div className='mb-6'>
    <UserProfileCard profile={userProfile} />
  </div>
)}
```

#### **3.4 Add Auto-Fetch Settings to Form Settings Page**
Update `app/(routes)/personal/forms/[formId]/settings/page.tsx`:

Add to schema:
```typescript
const settingsSchema = z.object({
  // ... existing fields
  enable_user_autofetch: z.boolean().default(false)
});
```

Add to form JSX (in Access Restrictions card):
```typescript
{form.watch('restrict_domain') && form.watch('allowed_domains').length > 0 && (
  <FormField
    control={form.control}
    name='enable_user_autofetch'
    render={({ field }) => (
      <FormItem className='flex items-center justify-between rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20'>
        <div className='space-y-0.5'>
          <FormLabel>Auto-Fetch User Data</FormLabel>
          <FormDescription>
            Automatically fetch student details from MYJKKN when they log in
            (requires domain restriction)
          </FormDescription>
        </div>
        <FormControl>
          <Switch
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        </FormControl>
      </FormItem>
    )}
  />
)}
```

---

### **Phase 4: Analytics Enhancement**

#### **4.1 Update Analytics Service**
Update `lib/services/personal-form-analytics-service.ts`:

Add new analytics functions:
```typescript
/**
 * Get responses grouped by department
 */
static async getResponsesByDepartment(
  formId: string,
  supabaseClient?: any
): Promise<{ department: string; count: number }[]> {
  const supabase = supabaseClient || createClientSupabaseClient();

  const { data, error } = await supabase
    .from('personal_form_responses')
    .select('user_profile')
    .eq('personal_form_id', formId)
    .not('user_profile', 'is', null);

  if (error) throw error;

  const departmentCounts: Record<string, number> = {};

  data.forEach((response: any) => {
    const dept = response.user_profile?.department || 'Unknown';
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
  });

  return Object.entries(departmentCounts)
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get responses grouped by year
 */
static async getResponsesByYear(
  formId: string,
  supabaseClient?: any
): Promise<{ year: number; count: number }[]> {
  const supabase = supabaseClient || createClientSupabaseClient();

  const { data, error } = await supabase
    .from('personal_form_responses')
    .select('user_profile')
    .eq('personal_form_id', formId)
    .not('user_profile', 'is', null);

  if (error) throw error;

  const yearCounts: Record<number, number> = {};

  data.forEach((response: any) => {
    const year = response.user_profile?.year || 0;
    if (year > 0) {
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    }
  });

  return Object.entries(yearCounts)
    .map(([year, count]) => ({ year: parseInt(year), count }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Get responses grouped by course
 */
static async getResponsesByCourse(
  formId: string,
  supabaseClient?: any
): Promise<{ course: string; count: number }[]> {
  const supabase = supabaseClient || createClientSupabaseClient();

  const { data, error } = await supabase
    .from('personal_form_responses')
    .select('user_profile')
    .eq('personal_form_id', formId)
    .not('user_profile', 'is', null);

  if (error) throw error;

  const courseCounts: Record<string, number> = {};

  data.forEach((response: any) => {
    const course = response.user_profile?.course || 'Unknown';
    courseCounts[course] = (courseCounts[course] || 0) + 1;
  });

  return Object.entries(courseCounts)
    .map(([course, count]) => ({ course, count }))
    .sort((a, b) => b.count - a.count);
}
```

#### **4.2 Create Institutional Analytics Component**
Create `app/(routes)/personal/forms/[formId]/analytics/_components/institutional-analytics.tsx`:

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, GraduationCap, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface InstitutionalAnalyticsProps {
  byDepartment: { department: string; count: number }[];
  byYear: { year: number; count: number }[];
  byCourse: { course: string; count: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function InstitutionalAnalytics({
  byDepartment,
  byYear,
  byCourse
}: InstitutionalAnalyticsProps) {
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* By Department */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Building2 className='h-5 w-5' />
              Responses by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <PieChart>
                <Pie
                  data={byDepartment}
                  dataKey='count'
                  nameKey='department'
                  cx='50%'
                  cy='50%'
                  outerRadius={80}
                  label
                >
                  {byDepartment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Year */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <GraduationCap className='h-5 w-5' />
              Responses by Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {byYear.map((item) => (
                <div key={item.year} className='flex items-center justify-between'>
                  <span className='font-medium'>Year {item.year}</span>
                  <div className='flex items-center gap-2'>
                    <div className='w-32 bg-gray-200 rounded-full h-2.5'>
                      <div
                        className='bg-blue-600 h-2.5 rounded-full'
                        style={{
                          width: `${(item.count / Math.max(...byYear.map(y => y.count))) * 100}%`
                        }}
                      />
                    </div>
                    <span className='text-sm font-semibold w-12 text-right'>
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Course */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Users className='h-5 w-5' />
            Responses by Course
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {byCourse.map((item) => (
              <div
                key={item.course}
                className='flex items-center justify-between p-4 border rounded-lg'
              >
                <span className='font-medium text-sm'>{item.course}</span>
                <span className='text-2xl font-bold text-blue-600'>{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### **4.3 Add API Route for Institutional Analytics**
Create `app/api/personal-forms/[formId]/analytics/institutional/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/auth/with-auth-api';
import { PersonalFormAnalyticsService } from '@/lib/services/personal-form-analytics-service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const GET = withAuthApi(async (req, context, session) => {
  try {
    const { formId } = context.params;
    const supabase = await createServerSupabaseClient();

    const [byDepartment, byYear, byCourse] = await Promise.all([
      PersonalFormAnalyticsService.getResponsesByDepartment(formId, supabase),
      PersonalFormAnalyticsService.getResponsesByYear(formId, supabase),
      PersonalFormAnalyticsService.getResponsesByCourse(formId, supabase)
    ]);

    return NextResponse.json({
      byDepartment,
      byYear,
      byCourse
    });
  } catch (error: any) {
    console.error('Error fetching institutional analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch institutional analytics' },
      { status: 500 }
    );
  }
});
```

---

### **Phase 5: Response Export Enhancement**

#### **5.1 Update CSV Export to Include User Profile**
Update `lib/services/personal-form-analytics-service.ts`:

In `exportToCSV` method:
```typescript
// Add profile columns if user_profile exists
const hasProfiles = responses.some(r => r.user_profile);

if (hasProfiles) {
  headers.push('Student ID', 'Student Name', 'Department', 'Year', 'Course');
}

// In row mapping:
if (hasProfiles) {
  row.push(
    response.user_profile?.student_id || '',
    response.user_profile?.full_name || '',
    response.user_profile?.department || '',
    response.user_profile?.year?.toString() || '',
    response.user_profile?.course || ''
  );
}
```

---

## **Testing Strategy**

### **Test Cases:**

#### **1. API Integration Tests**
- [ ] MYJKKN API connection successful
- [ ] API key authentication works
- [ ] Profile fetch returns correct data
- [ ] API timeout handled gracefully
- [ ] Invalid email returns proper error

#### **2. Cache Tests**
- [ ] Profile cached on first fetch
- [ ] Cached profile returned on second request
- [ ] Cache expires after configured duration
- [ ] Force refresh bypasses cache
- [ ] Cache cleared successfully

#### **3. Form Submission Tests**
- [ ] Profile auto-attached when enabled
- [ ] Submission works without profile if disabled
- [ ] Fallback behavior works if API fails
- [ ] Profile data stored in user_profile column

#### **4. Analytics Tests**
- [ ] Department analytics show correct counts
- [ ] Year analytics show correct distribution
- [ ] Course analytics accurate
- [ ] Charts render with real data

#### **5. Security Tests**
- [ ] API key encrypted in database
- [ ] Users can only fetch own profile
- [ ] Admins can fetch any profile
- [ ] Rate limiting prevents abuse

---

## **Security Considerations**

1. **API Key Security:**
   - Store encrypted in database
   - Never expose to frontend
   - Rotate periodically

2. **Profile Data Privacy:**
   - Users can only access own profile
   - Admin role required for other profiles
   - No sensitive data exposed

3. **Rate Limiting:**
   - Limit API calls per user
   - Cache to reduce external API hits
   - Monitor usage patterns

4. **Data Validation:**
   - Validate API responses
   - Sanitize profile data
   - Handle malformed responses

---

## **Migration Path**

### **For Existing Forms:**
1. Auto-fetch is **disabled by default**
2. Form owners can opt-in via Settings
3. Existing responses unaffected
4. New responses get enriched data

### **For New Forms:**
1. Show auto-fetch option during creation
2. Recommended for domain-restricted forms
3. One-click enable

---

## **Benefits Summary**

✅ **User Experience:**
- No repetitive data entry
- Faster form completion
- Auto-filled personal info

✅ **Data Quality:**
- Consistent institutional data
- No typos or variations
- Always up-to-date

✅ **Analytics:**
- Rich institutional insights
- Department/Year/Course breakdown
- Better decision-making

✅ **Maintainability:**
- Single source of truth (MYJKKN)
- Automatic updates
- Reduced support requests

---

## **Timeline Estimate**

- **Phase 1 (Database):** 2-3 hours
- **Phase 2 (Backend):** 4-5 hours
- **Phase 3 (Frontend):** 3-4 hours
- **Phase 4 (Analytics):** 2-3 hours
- **Phase 5 (Export):** 1-2 hours
- **Testing:** 2-3 hours

**Total:** 14-20 hours

---

## **Next Steps After Approval**

1. Confirm MYJKKN API endpoint details
2. Get API key and test credentials
3. Verify API response format
4. Start Phase 1 implementation
5. Progressive rollout with testing

---

**Ready for your approval to proceed with implementation!** 🚀
