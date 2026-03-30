// app/api/personal-forms/public/[formId]/route.ts
// Public access to personal forms (with domain-based access control)

import { NextRequest, NextResponse } from 'next/server';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isEmailDomainAllowed, formatDomainsForDisplay } from '@/lib/utils/domain-validation';

/**
 * GET /api/personal-forms/public/:formId
 * Get public form details
 * Supports domain-based access restriction
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const supabase = createClientSupabaseClient();

    // Fetch form if it's published (allow both public and private forms via direct link)
    const { data: form, error } = await supabase
      .from('personal_forms')
      .select('id, title, description, banner_url, fields, status, is_public, submission_limit, restrict_domain, allowed_domains, created_at')
      .eq('id', formId)
      .eq('status', 'published')
      .single();

    if (error || !form) {
      return NextResponse.json(
        { error: 'Form not found or not available' },
        { status: 404 }
      );
    }

    // Ensure fields is an array (handle Json type from database)
    const formFields = Array.isArray(form.fields) ? form.fields : [];

    // Check domain restriction if enabled
    if (form.restrict_domain && form.allowed_domains && form.allowed_domains.length > 0) {
      // Get authenticated user to check their email domain
      const serverSupabase = await createServerSupabaseClient();

      // Try getSession first, then getUser
      const { data: { session } } = await serverSupabase.auth.getSession();
      const { data: { user }, error: userError } = await serverSupabase.auth.getUser();

      console.log('[Public Personal Form] Domain restriction check:', {
        hasSession: !!session,
        hasUser: !!user,
        userEmail: user?.email,
        allowedDomains: form.allowed_domains
      });

      // If user is authenticated, check their email domain
      if (user?.email) {
        if (!isEmailDomainAllowed(user.email, form.allowed_domains)) {
          console.log('[Public Personal Form] Access denied - wrong domain:', user.email);
          return NextResponse.json(
            {
              error: 'Access Restricted',
              message: `This form is only available to users with ${formatDomainsForDisplay(form.allowed_domains)} email addresses.`,
              restrictedDomains: form.allowed_domains,
              userEmail: user.email
            },
            { status: 403 }
          );
        }
        console.log('[Public Personal Form] Access granted - correct domain:', user.email);
      } else {
        // User is not authenticated - they need to log in first to verify domain
        console.log('[Public Personal Form] No authenticated user - require auth');
        return NextResponse.json(
          {
            error: 'Authentication Required',
            message: `This form requires authentication with a ${formatDomainsForDisplay(form.allowed_domains)} email address.`,
            restrictedDomains: form.allowed_domains,
            requireAuth: true
          },
          { status: 401 }
        );
      }
    }

    // Return form with properly formatted fields
    return NextResponse.json({ ...form, fields: formFields }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching public form:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch form' },
      { status: 500 }
    );
  }
}
