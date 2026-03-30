// app/api/personal-forms/duplicate/route.ts
// API route for duplicating forms (institutional or personal)

import { NextRequest, NextResponse } from 'next/server';
import { PersonalFormService } from '@/lib/services/personal-form-service';
import { withAuthApi } from '@/lib/auth/with-auth-api';

/**
 * POST /api/personal-forms/duplicate
 * Duplicate a form from institutional or personal form
 * Body: { sourceFormId: string, sourceType: 'institutional' | 'personal' }
 */
export const POST = withAuthApi(async (req, context, session) => {
  try {
    const user = session!.user;
    const body = await req.json();

    // Validate required fields
    if (!body.sourceFormId || !body.sourceType) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceFormId, sourceType' },
        { status: 400 }
      );
    }

    if (!['institutional', 'personal'].includes(body.sourceType)) {
      return NextResponse.json(
        { error: 'sourceType must be either "institutional" or "personal"' },
        { status: 400 }
      );
    }

    const form = await PersonalFormService.duplicateForm(
      body.sourceFormId,
      body.sourceType,
      user.id
    );

    return NextResponse.json(form, { status: 201 });
  } catch (error: any) {
    console.error('Error duplicating form:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to duplicate form' },
      { status: 500 }
    );
  }
});
