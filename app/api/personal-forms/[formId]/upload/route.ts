// app/api/personal-forms/[formId]/upload/route.ts
// API route for uploading files for personal forms

import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage/storage-service';
import { PersonalFormService } from '@/lib/services/personal-form-service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/personal-forms/[formId]/upload
 * Upload a file for a personal form
 * Public endpoint - supports both authenticated and anonymous uploads
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ formId: string }> | { formId: string } }
) {
  try {
    const params = context.params instanceof Promise ? await context.params : context.params;
    const { formId } = params;

    // Create server Supabase client for proper session handling
    const supabase = await createServerSupabaseClient();

    // Get form details to use the form name in the folder structure
    const form = await PersonalFormService.getPersonalForm(formId);

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Check if form is accepting submissions
    if (form.status !== 'published') {
      return NextResponse.json(
        { error: 'This form is not accepting submissions' },
        { status: 400 }
      );
    }

    // Get file from form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Upload file with organized folder structure
    // Pass server Supabase client for proper session handling
    const { publicUrl, fileName, error } = await StorageService.uploadPersonalFormFile(
      file,
      form.title,
      formId,
      supabase
    );

    if (error || !publicUrl) {
      return NextResponse.json(
        { error: error?.message || 'Failed to upload file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: publicUrl,
      name: fileName
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
