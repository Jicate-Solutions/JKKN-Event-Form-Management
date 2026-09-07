// lib/services/myjkkn-api-service.ts
// Service for fetching user profile data from MYJKKN application

import {
  UserProfile,
  UserProfileCache,
  MYJKKNStudent,
  MYJKKNStaff,
  MYJKKNApiResponse
} from '@/types/personal-forms';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Raised when the MYJKKN directory itself is unreachable or misbehaving
 * (endpoint missing, HTML instead of JSON, timeout, auth failure).
 *
 * This is deliberately distinct from "user is not in the directory": callers
 * must be able to tell an outage apart from a genuine miss, because blocking a
 * submission is only correct for the latter.
 */
export class MYJKKNUpstreamError extends Error {
  constructor(
    message: string,
    public readonly endpoint: string
  ) {
    super(message);
    this.name = 'MYJKKNUpstreamError';
  }
}

/**
 * MYJKKN API Service
 * Handles fetching user profile data from MYJKKN application
 * with caching and automatic cache invalidation
 */
export class MYJKKNApiService {
  private static readonly CACHE_DURATION_HOURS = 24;
  private static readonly API_TIMEOUT_MS = 10000; // 10 seconds

  // The upstream `?search=` parameter matches first_name, last_name, staff_id
  // and the PERSONAL `email` column - it does NOT index `institution_email`.
  // ~38% of staff have a personal email that differs from their institutional
  // one, so searching by institutional email silently returns 0 results for
  // them. When the search misses we fall back to scanning the directory and
  // matching `institution_email` locally.
  private static readonly DIRECTORY_PAGE_LIMIT = 1000;
  private static readonly DIRECTORY_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static staffDirectoryCache: {
    fetchedAt: number;
    staff: MYJKKNStaff[];
  } | null = null;

  /**
   * Parse a fetch Response as JSON, failing loudly when the body is not JSON.
   *
   * A missing route on the MYJKKN app returns its SPA shell as `text/html` with
   * HTTP 200, which makes `response.ok` true and then explodes inside
   * `response.json()` as "Unexpected token '<'". Without this guard that looks
   * identical to "user not found".
   */
  private static async parseJsonResponse<T>(
    response: Response,
    endpoint: string
  ): Promise<T> {
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const preview = (await response.text()).slice(0, 120).replace(/\s+/g, ' ');
      throw new MYJKKNUpstreamError(
        `Expected JSON from ${endpoint} but received "${contentType}" ` +
          `(HTTP ${response.status}). The endpoint is likely missing or not ` +
          `enabled for this API key. Body starts: ${preview}`,
        endpoint
      );
    }

    return (await response.json()) as T;
  }

  /**
   * Fetch user profile with caching
   * Returns cached data if available and not expired, otherwise fetches from API
   * Uses system-wide API key from environment variables
   */
  static async getUserProfile(
    email: string,
    apiKey?: string
  ): Promise<UserProfile | null> {
    try {
      console.log('\n[MYJKKN API] getUserProfile called for:', email);

      // Use provided API key or fall back to system-wide key
      const effectiveApiKey = apiKey || process.env.MYJKKN_API_KEY;

      console.log('[MYJKKN API] API Key check:', {
        has_provided_key: !!apiKey,
        has_env_key: !!process.env.MYJKKN_API_KEY,
        has_effective_key: !!effectiveApiKey,
        effective_key_length: effectiveApiKey?.length || 0,
        myjkkn_api_url: process.env.NEXT_PUBLIC_MYJKKN_API_URL
      });

      if (!effectiveApiKey) {
        console.error('[MYJKKN API] ❌ No API key available');
        throw new Error('MYJKKN API key not configured');
      }

      // First, check cache
      console.log('[MYJKKN API] Checking cache for:', email);
      const cachedProfile = await this.getCachedProfile(email);
      if (cachedProfile) {
        console.log('[MYJKKN API] ✅ Using cached profile for:', email);
        return this.transformCacheToProfile(cachedProfile);
      }

      // Cache miss or expired, fetch from API
      console.log('[MYJKKN API] Cache miss - fetching from API for:', email);
      const profile = await this.fetchUserProfile(email, effectiveApiKey);

      if (profile) {
        console.log('[MYJKKN API] ✅ Profile fetched successfully, caching...');
        // Cache the fetched profile
        await this.cacheProfile(email, profile);
      } else {
        console.log('[MYJKKN API] ⚠️ No profile found in API');
      }

      return profile;
    } catch (error) {
      // An outage must NOT be reported as "user not found" - the caller decides
      // how to handle a broken directory, and it is not the user's fault.
      if (error instanceof MYJKKNUpstreamError) {
        console.error('[MYJKKN API] ❌ Directory unavailable:', error.message);
        throw error;
      }

      console.error('[MYJKKN API] ❌ Error getting user profile:', error);
      return null; // Gracefully fail - don't block form submission
    }
  }

  /**
   * Fetch user profile from MYJKKN API
   * Tries student endpoint first, then staff endpoint (Sequential Search)
   *
   * Returns null only when BOTH directories answered successfully and neither
   * held the email. If either directory was unreachable we cannot prove the
   * user is absent, so we surface the outage instead of a false negative.
   */
  private static async fetchUserProfile(
    email: string,
    apiKey: string
  ): Promise<UserProfile | null> {
    const outages: MYJKKNUpstreamError[] = [];

    // Try student endpoint first
    try {
      const studentProfile = await this.fetchStudentByEmail(email, apiKey);
      if (studentProfile) {
        return studentProfile;
      }
    } catch (error) {
      if (error instanceof MYJKKNUpstreamError) {
        outages.push(error);
      }
      console.log('[MYJKKN API] Not found in students, trying staff...', error);
    }

    // Try staff endpoint
    try {
      const staffProfile = await this.fetchStaffByEmail(email, apiKey);
      if (staffProfile) {
        return staffProfile;
      }
    } catch (error) {
      if (error instanceof MYJKKNUpstreamError) {
        outages.push(error);
      }
      console.log('[MYJKKN API] Not found in staff', error);
    }

    if (outages.length > 0) {
      throw new MYJKKNUpstreamError(
        `Could not verify ${email}: ` +
          outages.map((o) => `[${o.endpoint}] ${o.message}`).join(' | '),
        outages.map((o) => o.endpoint).join(',')
      );
    }

    // Both directories responded and neither knows this email.
    return null;
  }

  /**
   * Fetch the full staff directory (cached briefly in-process).
   *
   * Used as the fallback when `?search=` misses, because upstream search does
   * not index `institution_email`. The upstream API accepts `limit=1000` and
   * returns the whole roster in a single response.
   */
  private static async fetchStaffDirectory(
    apiKey: string
  ): Promise<MYJKKNStaff[]> {
    const cached = this.staffDirectoryCache;
    if (cached && Date.now() - cached.fetchedAt < this.DIRECTORY_TTL_MS) {
      console.log(
        `[MYJKKN API] Using in-process staff directory (${cached.staff.length} records)`
      );
      return cached.staff;
    }

    const endpoint = `${process.env.NEXT_PUBLIC_MYJKKN_API_URL}/api/api-management/staff`;
    const url = `${endpoint}?limit=${this.DIRECTORY_PAGE_LIMIT}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT_MS);

    try {
      console.log('[MYJKKN API] Fetching full staff directory (search fallback)');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new MYJKKNUpstreamError(
          `Staff directory error: HTTP ${response.status}`,
          endpoint
        );
      }

      const data = await this.parseJsonResponse<MYJKKNApiResponse<MYJKKNStaff>>(
        response,
        endpoint
      );

      const staff = data.data || [];
      console.log(`[MYJKKN API] Staff directory loaded: ${staff.length} records`);

      this.staffDirectoryCache = { fetchedAt: Date.now(), staff };
      return staff;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new MYJKKNUpstreamError(
          'Staff directory request timeout',
          endpoint
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch student profile by email
   * Uses COLLEGE_EMAIL (institutional email) for matching
   */
  private static async fetchStudentByEmail(
    email: string,
    apiKey: string
  ): Promise<UserProfile | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT_MS);

    // Use search parameter to find student by email
    const searchUrl = `${process.env.NEXT_PUBLIC_MYJKKN_API_URL}/api/api-management/students?search=${encodeURIComponent(email)}`;

    try {
      console.log('[MYJKKN API] Fetching student from:', searchUrl);
      console.log('[MYJKKN API] Using API key:', apiKey.substring(0, 10) + '...');

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('[MYJKKN API] Student API response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          console.log('[MYJKKN API] Student not found (404)');
          return null; // Student not found
        }
        const errorText = await response.text();
        console.error('[MYJKKN API] Student API error:', response.status, errorText);
        throw new MYJKKNUpstreamError(
          `Student API error: HTTP ${response.status}`,
          searchUrl
        );
      }

      const data = await this.parseJsonResponse<MYJKKNApiResponse<MYJKKNStudent>>(
        response,
        searchUrl
      );
      console.log('[MYJKKN API] Student API returned:', data.data.length, 'results');

      // Find exact email match using COLLEGE_EMAIL (institutional email)
      // NOT student_email (personal email)
      const student = data.data.find(
        (s) => s.college_email?.toLowerCase() === email.toLowerCase()
      );

      if (!student) {
        console.log(`[MYJKKN API] No student found with college_email: ${email}`);
        console.log('[MYJKKN API] Available emails in results:', data.data.map(s => s.college_email));
        return null; // No exact match found
      }

      console.log(`[MYJKKN API] ✅ Student found: ${student.first_name} ${student.last_name} (${student.roll_number})`);

      // Transform to unified profile structure
      return {
        user_type: 'student',
        full_name: `${student.first_name} ${student.last_name}`.trim(),
        email: student.college_email, // Use institutional email
        mobile: student.student_mobile,
        institution_name: student.institution?.name || null,
        department_name: student.department?.department_name || null,
        identifier: student.roll_number,
        additional_info: student.program?.program_name || null,
        is_active: student.is_profile_complete
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[MYJKKN API] ❌ Student API request timeout');
        throw new MYJKKNUpstreamError('Student API request timeout', searchUrl);
      }
      console.error('[MYJKKN API] ❌ Student fetch error:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch staff profile by email
   * Uses INSTITUTION_EMAIL (institutional email) for matching
   */
  private static async fetchStaffByEmail(
    email: string,
    apiKey: string
  ): Promise<UserProfile | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT_MS);

    // Use search parameter to find staff by email
    const searchUrl = `${process.env.NEXT_PUBLIC_MYJKKN_API_URL}/api/api-management/staff?search=${encodeURIComponent(email)}`;

    try {
      console.log('[MYJKKN API] Fetching staff from:', searchUrl);
      console.log('[MYJKKN API] Using API key:', apiKey.substring(0, 10) + '...');

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('[MYJKKN API] Staff API response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          console.log('[MYJKKN API] Staff not found (404)');
          return null; // Staff not found
        }
        const errorText = await response.text();
        console.error('[MYJKKN API] Staff API error:', response.status, errorText);
        throw new MYJKKNUpstreamError(
          `Staff API error: HTTP ${response.status}`,
          searchUrl
        );
      }

      const data = await this.parseJsonResponse<MYJKKNApiResponse<MYJKKNStaff>>(
        response,
        searchUrl
      );
      console.log('[MYJKKN API] Staff API returned:', data.data.length, 'results');

      // Find exact email match using INSTITUTION_EMAIL (institutional email)
      // NOT email or staff_email (personal email)
      let staff = this.matchByInstitutionEmail(data.data, email);

      if (!staff) {
        // Upstream `?search=` does not index institution_email, so a miss here
        // proves nothing. Scan the full directory before declaring absence.
        console.log(
          `[MYJKKN API] Search missed institution_email: ${email} - scanning full directory`
        );
        const directory = await this.fetchStaffDirectory(apiKey);
        staff = this.matchByInstitutionEmail(directory, email);
      }

      if (!staff) {
        console.log(`[MYJKKN API] No staff found with institution_email: ${email}`);
        return null; // No exact match found
      }

      console.log(`[MYJKKN API] ✅ Staff found: ${staff.first_name} ${staff.last_name} (${staff.staff_id})`);

      // Transform to unified profile structure.
      // NOTE: the upstream payload uses `phone` (not `staff_mobile`) and
      // `category.category_name` (not `category.name`).
      return {
        user_type: 'staff',
        full_name: `${staff.first_name} ${staff.last_name}`.trim(),
        email: staff.institution_email, // Use institutional email
        mobile: staff.phone ?? null,
        institution_name: staff.institution?.name || null,
        department_name: staff.department?.department_name || null,
        identifier: staff.staff_id,
        additional_info: staff.category?.category_name || null,
        is_active: staff.is_active
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[MYJKKN API] ❌ Staff API request timeout');
        throw new MYJKKNUpstreamError('Staff API request timeout', searchUrl);
      }
      console.error('[MYJKKN API] ❌ Staff fetch error:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Case-insensitive exact match on the institutional email.
   */
  private static matchByInstitutionEmail(
    staff: MYJKKNStaff[],
    email: string
  ): MYJKKNStaff | undefined {
    const target = email.trim().toLowerCase();
    return staff.find(
      (s) => s.institution_email?.trim().toLowerCase() === target
    );
  }

  /**
   * Get cached profile if available and not expired
   */
  private static async getCachedProfile(
    email: string
  ): Promise<UserProfileCache | null> {
    try {
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from('user_profile_cache')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !data) {
        return null;
      }

      // Check if cache is expired
      const fetchedAt = new Date(data.fetched_at);
      const now = new Date();
      const hoursSinceFetch = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceFetch > this.CACHE_DURATION_HOURS) {
        console.log('Cache expired for:', email);
        return null; // Cache expired
      }

      return data as UserProfileCache;
    } catch (error) {
      console.error('Error checking cache:', error);
      return null;
    }
  }

  /**
   * Cache user profile in database
   */
  private static async cacheProfile(
    email: string,
    profile: UserProfile
  ): Promise<void> {
    try {
      const supabase = createAdminClient();

      const cacheData = {
        email: email.toLowerCase(),
        user_type: profile.user_type,
        full_name: profile.full_name,
        mobile: profile.mobile,
        institution_name: profile.institution_name,
        department_name: profile.department_name,
        identifier: profile.identifier,
        additional_info: profile.additional_info,
        raw_data: profile as any, // Store complete profile for debugging (cast to Json)
        is_active: profile.is_active,
        fetched_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_profile_cache')
        .upsert(cacheData, {
          onConflict: 'email',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error caching profile:', error);
        // Don't throw - caching failure shouldn't block the operation
      } else {
        console.log('Profile cached successfully for:', email);
      }
    } catch (error) {
      console.error('Error caching profile:', error);
      // Don't throw - caching failure shouldn't block the operation
    }
  }

  /**
   * Transform cached profile to UserProfile
   */
  private static transformCacheToProfile(
    cache: UserProfileCache
  ): UserProfile {
    return {
      user_type: cache.user_type,
      full_name: cache.full_name,
      email: cache.email,
      mobile: cache.mobile,
      institution_name: cache.institution_name,
      department_name: cache.department_name,
      identifier: cache.identifier,
      additional_info: cache.additional_info,
      is_active: cache.is_active
    };
  }

  /**
   * Invalidate cache for a specific email
   * Useful for manual cache refresh
   */
  static async invalidateCache(email: string): Promise<void> {
    try {
      const supabase = createAdminClient();

      const { error } = await supabase
        .from('user_profile_cache')
        .delete()
        .eq('email', email.toLowerCase());

      if (error) {
        console.error('Error invalidating cache:', error);
      } else {
        console.log('Cache invalidated for:', email);
      }
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  /**
   * Clear expired cache entries
   * Should be called periodically (e.g., via cron job)
   */
  static async clearExpiredCache(): Promise<number> {
    try {
      const supabase = createAdminClient();

      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() - this.CACHE_DURATION_HOURS);

      const { data, error } = await supabase
        .from('user_profile_cache')
        .delete()
        .lt('fetched_at', expiryDate.toISOString())
        .select('id');

      if (error) {
        console.error('Error clearing expired cache:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      console.log(`Cleared ${deletedCount} expired cache entries`);
      return deletedCount;
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * Useful for monitoring and debugging
   */
  static async getCacheStats(): Promise<{
    total: number;
    students: number;
    staff: number;
    expired: number;
  }> {
    try {
      const supabase = createAdminClient();

      // Get total count
      const { count: total } = await supabase
        .from('user_profile_cache')
        .select('*', { count: 'exact', head: true });

      // Get student count
      const { count: students } = await supabase
        .from('user_profile_cache')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'student');

      // Get staff count
      const { count: staff } = await supabase
        .from('user_profile_cache')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'staff');

      // Get expired count
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() - this.CACHE_DURATION_HOURS);

      const { count: expired } = await supabase
        .from('user_profile_cache')
        .select('*', { count: 'exact', head: true })
        .lt('fetched_at', expiryDate.toISOString());

      return {
        total: total || 0,
        students: students || 0,
        staff: staff || 0,
        expired: expired || 0
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { total: 0, students: 0, staff: 0, expired: 0 };
    }
  }
}
