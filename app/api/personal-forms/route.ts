// app/api/personal-forms/route.ts
// API routes for personal forms CRUD operations

import { NextRequest, NextResponse } from 'next/server';
import { PersonalFormService } from '@/lib/services/personal-form-service';
import { withAuthApi } from '@/lib/auth/with-auth-api';
import { CreatePersonalFormPayload, PersonalFormFilters } from '@/types/personal-forms';

/**
 * GET /api/personal-forms
 * List personal forms with filtering and pagination
 */
export const GET = withAuthApi(async (req, context, session) => {
  try {
    const user = session!.user;
    const { searchParams } = new URL(req.url);

    // Parse filters from query params
    const filters: PersonalFormFilters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') as any,
      is_public: searchParams.get('is_public') === 'true' ? true :
                 searchParams.get('is_public') === 'false' ? false : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sort_by: searchParams.get('sort_by') as any || 'created_at',
      sort_order: searchParams.get('sort_order') as any || 'desc'
    };

    // Create server Supabase client with proper auth context
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = await createServerSupabaseClient();

    // Pass user ID to service for proper access control
    const result = await PersonalFormService.getPersonalForms(
      filters,
      user.id,
      supabase
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching personal forms:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch personal forms' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/personal-forms
 * Create a new personal form
 */
export const POST = withAuthApi(async (req, context, session) => {
  try {
    const user = session!.user;
    const body = await req.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      );
    }

    // Auto-enable user autofetch if domain is restricted to jkkn.ac.in
    const restrictDomain = body.restrict_domain ?? false;
    const allowedDomains = body.allowed_domains || [];
    const hasJKKNDomain = allowedDomains.some((domain: string) =>
      domain.toLowerCase().includes('jkkn.ac.in')
    );

    // Automatically enable autofetch for JKKN domain restriction
    const enableUserAutofetch = restrictDomain && hasJKKNDomain;

    // Set default fallback behavior for JKKN forms
    const requireInstitutionalProfile = enableUserAutofetch; // Block non-JKKN users
    const allowManualEntryFallback = false; // Don't allow manual entry

    // Ensure created_by is set to the authenticated user
    const payload: CreatePersonalFormPayload = {
      title: body.title,
      description: body.description || '',
      banner_url: body.banner_url || null,
      fields: body.fields || [],
      status: body.status || 'draft',
      is_public: body.is_public ?? false,
      submission_limit: body.submission_limit || null,
      restrict_domain: restrictDomain,
      allowed_domains: allowedDomains,
      enable_user_autofetch: enableUserAutofetch,
      require_institutional_profile: requireInstitutionalProfile,
      allow_manual_entry_fallback: allowManualEntryFallback,
      created_by: user.id
    };

    // Get server Supabase client to pass to service
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = await createServerSupabaseClient();

    const form = await PersonalFormService.createPersonalForm(payload, supabase);

    return NextResponse.json(form, { status: 201 });
  } catch (error: any) {
    console.error('Error creating personal form:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create personal form' },
      { status: 500 }
    );
  }
});
