import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Form, FormField } from '@/types/forms';
import { Parser } from '@json2csv/plainjs';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { generateSlug, generateUniqueSlug, isUUID } from '@/lib/utils/slug';

// Evaluate a single conditional rule against submitted response data
const evaluateConditionalRuleValue = (
  sourceValue: any,
  state: string,
  ruleValue?: string
): boolean => {
  switch (state) {
    case 'is_empty':
      return sourceValue === undefined || sourceValue === null || sourceValue === '' ||
        (Array.isArray(sourceValue) && sourceValue.length === 0);
    case 'is_filled':
      return sourceValue !== undefined && sourceValue !== null && sourceValue !== '' &&
        (!Array.isArray(sourceValue) || sourceValue.length > 0);
    case 'is_equal':
      return String(sourceValue) === String(ruleValue ?? '');
    case 'is_not_equal':
      return String(sourceValue) !== String(ruleValue ?? '');
    case 'contains':
      return typeof sourceValue === 'string' && sourceValue.includes(ruleValue ?? '');
    case 'not_contains':
      return typeof sourceValue === 'string' && !sourceValue.includes(ruleValue ?? '');
    case 'greater_than':
      return Number(sourceValue) > Number(ruleValue);
    case 'less_than':
      return Number(sourceValue) < Number(ruleValue);
    case 'age_greater_than_or_equal': {
      if (!sourceValue) return false;
      const birth = new Date(sourceValue);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age >= Number(ruleValue);
    }
    case 'age_less_than': {
      if (!sourceValue) return false;
      const birth = new Date(sourceValue);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age < Number(ruleValue);
    }
    default:
      return false;
  }
};

// Determine if a field is visible based on conditional rules and submitted response data
const isFieldVisible = (
  field: any,
  allFields: any[],
  responseData: Record<string, any>
): boolean => {
  let visible = true;

  // Check the field's own conditional_rules
  if (field.conditional_rules && field.conditional_rules.length > 0) {
    for (const rule of field.conditional_rules) {
      const sourceValue = responseData[rule.source_field_id];
      const conditionMet = evaluateConditionalRuleValue(sourceValue, rule.state, rule.value);
      if (conditionMet) {
        if (rule.action === 'hide') { visible = false; break; }
        else if (rule.action === 'show') { visible = true; }
      } else {
        if (rule.action === 'show') { visible = false; }
      }
    }
  }

  // Check other fields' rules that target this field
  allFields.forEach((otherField: any) => {
    if (otherField.id === field.id || !otherField.conditional_rules) return;
    otherField.conditional_rules.forEach((rule: any) => {
      if (!rule.target_field_ids?.includes(field.id)) return;
      const sourceValue = responseData[rule.source_field_id];
      const conditionMet = evaluateConditionalRuleValue(sourceValue, rule.state, rule.value);
      if (conditionMet) {
        if (rule.action === 'hide' || rule.action === 'hide_multiple') visible = false;
        else if (rule.action === 'show' || rule.action === 'show_multiple') visible = true;
      } else {
        if (rule.action === 'show' || rule.action === 'show_multiple') visible = false;
      }
    });
  });

  return visible;
};

// Utility function to safely stringify conditional field data
const safeStringifyConditionalValue = (value: any): string => {
  if (value === null || value === undefined) return '';

  // Extract values from deeply nested conditional objects
  const extractConditionalValues = (
    data: any
  ): { mainValue: string; conditionalValue: string } => {
    if (!data) return { mainValue: '', conditionalValue: '' };

    // If not an object, return as mainValue
    if (typeof data !== 'object')
      return { mainValue: String(data), conditionalValue: '' };

    // Base case: simple mainValue/conditionalValue object
    if ('mainValue' in data && typeof data.mainValue !== 'object') {
      return {
        mainValue: data.mainValue || '',
        conditionalValue: data.conditionalValue || ''
      };
    }

    // Recursive case: nested mainValue objects
    if ('mainValue' in data && typeof data.mainValue === 'object') {
      // Keep the current conditionalValue, but check inner mainValue
      const innerValues = extractConditionalValues(data.mainValue);
      return {
        mainValue: innerValues.mainValue,
        conditionalValue: data.conditionalValue || innerValues.conditionalValue
      };
    }

    // Fallback for other structures
    return {
      mainValue: JSON.stringify(data),
      conditionalValue: ''
    };
  };

  // If it's an object with mainValue and conditionalValue, format it properly
  if (typeof value === 'object' && 'mainValue' in value) {
    const { mainValue, conditionalValue } = extractConditionalValues(value);
    if (conditionalValue) {
      return `${mainValue} - ${conditionalValue}`;
    }
    return mainValue || '';
  }

  // For simple string values
  return String(value);
};

export const FormService = {
  // Helper function to check if a slug already exists
  async checkSlugExists(slug: string): Promise<boolean> {
    const supabase = createClientSupabaseClient();
    const { data, error } = await supabase
      .from('forms')
      .select('id')
      .eq('slug', slug)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  },

  async createForm(form: Omit<Form, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const supabase = createClientSupabaseClient();
      console.log('Creating form with data:', form);

      // Validate required fields
      if (
        !form.title ||
        !form.institution_id ||
        !form.created_by ||
        !form.fields
      ) {
        throw new Error('Missing required fields');
      }

      // Generate slug from title for new forms
      const baseSlug = generateSlug(form.title);
      const uniqueSlug = await generateUniqueSlug(
        baseSlug,
        this.checkSlugExists
      );

      const { data, error } = await supabase
        .from('forms')
        .insert([
          {
            title: form.title,
            description: form.description,
            banner_url: form.banner_url,
            fields: form.fields as any,
            is_public: form.is_public,
            status: form.status,
            institution_id: form.institution_id,
            event_id: form.event_id,
            created_by: form.created_by,
            submission_limit: form.submission_limit,
            slug: uniqueSlug
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Form creation error:', error);
      throw error;
    }
  },

  async updateForm(id: string, updates: Partial<Form>) {
    const supabase = createClientSupabaseClient();

    // If title is being updated, update the slug as well
    if (updates.title) {
      const baseSlug = generateSlug(updates.title);
      // Check if we need to generate a new unique slug
      const currentForm = await this.getForm(id);
      if (currentForm.slug && baseSlug !== currentForm.slug.split('-')[0]) {
        updates.slug = await generateUniqueSlug(baseSlug, this.checkSlugExists);
      } else if (!currentForm.slug) {
        // Add slug to existing forms that don't have one
        updates.slug = await generateUniqueSlug(baseSlug, this.checkSlugExists);
      }
    }

    // Filter out undefined values to prevent overwriting existing data
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    // Cast fields to any to avoid type errors with Supabase Json type
    if (cleanedUpdates.fields) {
      cleanedUpdates.fields = cleanedUpdates.fields as any;
    }

    const { data, error } = await supabase
      .from('forms')
      .update(cleanedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getForms(filters?: { institution_id?: string; event_id?: string }) {
    try {
      const supabase = createClientSupabaseClient();
      console.log('Fetching forms...');

      let query = supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.institution_id) {
        query = query.eq('institution_id', filters.institution_id);
      }

      if (filters?.event_id) {
        query = query.eq('event_id', filters.event_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching forms:', error);
        throw error;
      }

      console.log('Forms data:', data);
      return data;
    } catch (error) {
      console.error('Error in getForms:', error);
      throw error;
    }
  },

  async getForm(idOrSlug: string) {
    const supabase = createClientSupabaseClient();

    // Determine if the identifier is a UUID or a slug
    const isUUIDFormat = isUUID(idOrSlug);

    let query = supabase.from('forms').select('*');

    if (isUUIDFormat) {
      // Use UUID lookup
      query = query.eq('id', idOrSlug);
    } else {
      // Use slug lookup
      query = query.eq('slug', idOrSlug);
    }

    const { data, error } = await query.single();

    if (error) throw error;
    return data;
  },

  async deleteForm(id: string) {
    const supabase = createClientSupabaseClient();

    const { error } = await supabase.from('forms').delete().eq('id', id);

    if (error) throw error;
  },

  async getSubmissionStats(formId: string) {
    try {
      const supabase = createClientSupabaseClient();

      // Get form details including submission limit
      const { data: form, error: formError } = await supabase
        .from('forms')
        .select('submission_limit')
        .eq('id', formId)
        .single();

      if (formError) throw formError;

      // Get current submission count
      const { count, error: countError } = await supabase
        .from('form_responses')
        .select('id', { count: 'exact', head: true })
        .eq('form_id', formId);

      if (countError) throw countError;

      const currentCount = count || 0;
      const submissionLimit = form.submission_limit;

      return {
        currentCount,
        submissionLimit,
        remainingSlots: submissionLimit
          ? Math.max(0, submissionLimit - currentCount)
          : null,
        isUnlimited: !submissionLimit,
        canSubmit: !submissionLimit || currentCount < submissionLimit
      };
    } catch (error) {
      console.error('Error getting submission stats:', error);
      throw error;
    }
  },

  async canAcceptSubmission(formId: string): Promise<boolean> {
    try {
      const stats = await this.getSubmissionStats(formId);
      return stats.canSubmit;
    } catch (error) {
      console.error('Error checking if form can accept submission:', error);
      // If we can't check, allow submission to prevent blocking
      return true;
    }
  },

  async exportResponses(formId: string, format: 'csv' | 'excel') {
    const supabase = createClientSupabaseClient();

    // Get form details
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (formError) throw formError;

    // Get the total count of responses
    const { count: totalCount, error: countError } = await supabase
      .from('form_responses')
      .select('id', { count: 'exact', head: true })
      .eq('form_id', formId);

    if (countError) throw countError;

    console.log(`Total form responses for export: ${totalCount || 0}`);

    // Initialize array to hold all responses
    let allResponses: any[] = [];

    // If we have more than 1000 responses, we need to paginate
    if (totalCount && totalCount > 1000) {
      console.log(`Found ${totalCount} responses, using pagination for export`);

      const PAGE_SIZE = 1000;
      const totalPages = Math.ceil(totalCount / PAGE_SIZE);

      // Fetch responses in chunks
      for (let page = 0; page < totalPages; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        console.log(
          `Fetching export page ${page + 1}/${totalPages} (range: ${from}-${to})`
        );

        // Add retry logic for page fetching
        let pageData = null;
        let pageError = null;
        let retryCount = 0;
        const MAX_RETRIES = 3;

        while (retryCount < MAX_RETRIES && !pageData) {
          try {
            const result = await supabase
              .from('form_responses')
              .select('*')
              .eq('form_id', formId)
              .order('submitted_at', { ascending: false })
              .range(from, to);

            pageData = result.data;
            pageError = result.error;

            if (pageError) {
              console.error(
                `Error fetching export page ${page + 1} (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
                pageError
              );

              // Print more details if available
              if (pageError.message) {
                console.error(`Error message: ${pageError.message}`);
              }
              if (pageError.code) {
                console.error(`Error code: ${pageError.code}`);
              }
              if (pageError.details) {
                console.error(
                  `Error details: ${JSON.stringify(pageError.details)}`
                );
              }

              // Reset pageData to ensure retry
              pageData = null;
              retryCount++;

              // Wait before retrying
              if (retryCount < MAX_RETRIES) {
                const delay = Math.pow(2, retryCount) * 500; // Exponential backoff
                console.log(`Retrying export in ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }
          } catch (error) {
            console.error(
              `Unexpected error fetching export page ${page + 1} (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
              error
            );
            retryCount++;

            // Wait before retrying
            if (retryCount < MAX_RETRIES) {
              const delay = Math.pow(2, retryCount) * 500; // Exponential backoff
              console.log(`Retrying export in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }

        if (pageError || !pageData) {
          console.error(
            `Failed to fetch export page ${page + 1} after ${MAX_RETRIES} attempts`
          );
          // Continue with next page instead of failing entire operation
          continue;
        }

        if (pageData && pageData.length > 0) {
          allResponses = [...allResponses, ...pageData];
          console.log(
            `Added ${pageData.length} responses for export, total: ${allResponses.length} of ${totalCount}`
          );
        } else {
          console.log(`No data found on export page ${page + 1}`);
        }
      }
    } else {
      // For smaller datasets, use a single query
      const { data, error } = await supabase
        .from('form_responses')
        .select('*')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      allResponses = data || [];
    }

    console.log(`Preparing export for ${allResponses.length} responses`);

    // Prepare data for export
    const exportData = allResponses.map((response) => {
      const flatData: Record<string, any> = {
        submitted_at: new Date(response.submitted_at).toLocaleString(),
        submitted_by: response.user_email,
        submission_id: response.submission_id || 'N/A',
        // Add payment details
        payment_status: response.payment_status || 'N/A',
        payment_amount: response.payment_amount
          ? `₹${response.payment_amount}`
          : 'N/A',
        payment_id: response.payment_id || 'N/A',
        payment_updated_at: response.payment_updated_at
          ? new Date(response.payment_updated_at).toLocaleString()
          : 'N/A'
      };

      // Flatten response data based on form fields
      (form.fields as unknown as FormField[])?.forEach((field: FormField) => {
        flatData[field.label] = safeStringifyConditionalValue(
          response.response_data[field.id]
        );
      });

      return flatData;
    });

    if (format === 'csv') {
      // Generate CSV
      const parser = new Parser();
      const csv = parser.parse(exportData);

      // Create and download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${form.title}-responses.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      // Generate Excel
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');

      // Create and download file
      XLSX.writeFile(workbook, `${form.title}-responses.xlsx`);
    }
  },

  async hasUserSubmitted(formId: string, userEmail: string) {
    const supabase = createClientSupabaseClient();

    const { count, error } = await supabase
      .from('form_responses')
      .select('*', { count: 'exact' })
      .eq('form_id', formId)
      .eq('user_email', userEmail);

    if (error) throw error;
    return count && count > 0;
  },

  async submitResponse(
    formId: string,
    responseData: Record<string, any>,
    userEmail: string
  ) {
    const supabase = createClientSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    // First, get the form to retrieve event information, form name, and check submission limit
    const { data: formData, error: formError } = await supabase
      .from('forms')
      .select('id, event_id, title, description, fields, submission_limit')
      .eq('id', formId)
      .single();

    if (formError) {
      console.error('Error fetching form data:', formError);
      throw formError;
    }

    // Check submission limit before processing
    if (formData.submission_limit && formData.submission_limit > 0) {
      const canSubmit = await this.canAcceptSubmission(formId);
      if (!canSubmit) {
        throw new Error(
          `Submission limit of ${formData.submission_limit} has been reached for this form.`
        );
      }
    }

    // Check if form has payment fields — only count fields visible given the submitted data
    const allFields = (formData.fields as any[]) || [];
    const paymentFields = allFields.filter(
      (field: any) =>
        field.type === 'payment' &&
        isFieldVisible(field, allFields, responseData)
    );
    const hasPayment = paymentFields.length > 0;
    const totalAmount = paymentFields.reduce(
      (sum: number, field: any) => sum + (field.payment_amount || 0),
      0
    );

    // Generate form prefix for submission ID (first three letters of form name)
    let formPrefix = 'FOR'; // Default prefix if form title is not available

    if (formData?.title) {
      // Use first three letters of form title
      formPrefix = formData.title.substring(0, 3).toUpperCase();
    }

    // Get the count of existing submissions for this prefix to determine the next number
    const { count, error: countError } = await supabase
      .from('form_responses')
      .select('id', { count: 'exact', head: true })
      .ilike('submission_id', `SUB-${formPrefix}-%`);

    if (countError) {
      console.error('Error getting submission count:', countError);
    }

    // Generate sequential number (starting from 1)
    const sequentialNumber = (count ? count + 1 : 1)
      .toString()
      .padStart(6, '0');

    // Generate the submission ID in the format SUB-FOR-NNNNNN (where FOR is form name first three letters and NNNNNN is sequential number)
    const submissionId = `SUB-${formPrefix}-${sequentialNumber}`;

    // Use a transaction to ensure we get a unique, sequential ID even under concurrent submissions
    const { data, error } = await supabase.rpc('create_form_response', {
      p_form_id: formId,
      p_response_data: responseData,
      p_submitted_by: (user?.id || null) as any,
      p_is_anonymous: !user?.id,
      p_user_email: userEmail,
      p_submission_id: submissionId,
      p_payment_status:
        hasPayment && totalAmount > 0 ? 'pending' : 'not_required',
      p_payment_amount: hasPayment && totalAmount > 0 ? totalAmount : null
    });

    if (error) {
      console.error('Error submitting form response:', error);

      // If we still get a conflict, use a timestamp as fallback
      if (
        error.code === '23505' &&
        error.message?.includes('idx_form_responses_unique_submission_id')
      ) {
        console.log(
          'Duplicate submission ID detected, retrying with timestamp-based ID'
        );

        // Generate a new submission ID with timestamp and random suffix for uniqueness
        const timestamp = new Date().getTime().toString().slice(-6);
        const randomSuffix = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, '0');
        const fallbackId = `SUB-${formPrefix}-${timestamp}${randomSuffix}`;

        console.log('Retry with fallback submission ID:', fallbackId);

        // Try again with the fallback ID
        const { data: retryData, error: retryError } = await supabase
          .from('form_responses')
          .insert({
            form_id: formId,
            response_data: responseData,
            submitted_by: user?.id || null,
            is_anonymous: !user?.id,
            user_email: userEmail,
            submission_id: fallbackId,
            payment_status:
              hasPayment && totalAmount > 0 ? 'pending' : 'not_required',
            payment_amount: hasPayment && totalAmount > 0 ? totalAmount : null
          })
          .select()
          .single();

        if (retryError) throw retryError;

        // Send email notification for form submission
        try {
          await fetch('/api/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              formTitle: formData.title,
              formDescription: formData.description,
              submissionId: fallbackId,
              submissionDate: new Date().toLocaleString(),
              userEmail: userEmail,
              paymentStatus:
                hasPayment && totalAmount > 0 ? 'pending' : 'not_required',
              paymentAmount: hasPayment && totalAmount > 0 ? totalAmount : null
            })
          });
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
          // Don't throw error here to avoid blocking form submission
        }

        return retryData;
      }

      throw error;
    }

    // Send email notification for form submission
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formTitle: formData.title,
          formDescription: formData.description,
          submissionId: submissionId,
          submissionDate: new Date().toLocaleString(),
          userEmail: userEmail,
          paymentStatus:
            hasPayment && totalAmount > 0 ? 'pending' : 'not_required',
          paymentAmount: hasPayment && totalAmount > 0 ? totalAmount : null
        })
      });
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't throw error here to avoid blocking form submission
    }

    return data;
  },

  async getEventForms(eventId: string) {
    try {
      const supabase = createClientSupabaseClient();

      const { data, error } = await supabase
        .from('forms')
        .select(
          `
          *,
          events (
            id,
            title
          )
        `
        )
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching event forms:', error);
      throw error;
    }
  },

  async hasEventForms(eventId: string): Promise<boolean> {
    try {
      const supabase = createClientSupabaseClient();

      const { count, error } = await supabase
        .from('forms')
        .select('*', { count: 'exact' })
        .eq('event_id', eventId)
        .single();

      if (error) throw error;
      return !!count;
    } catch (error) {
      console.error('Error checking event forms:', error);
      return false;
    }
  },

  async getFormResponses(formId: string, user?: { id: string; role?: string }) {
    const supabase = createClientSupabaseClient();

    console.log('getFormResponses called with:', { formId, user });
    console.log('User role:', user?.role);

    try {
      // First, check if the user has admin privileges in the profiles table
      if (user?.id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        } else {
          console.log('User profile data:', profileData);

          // If user is super_admin or administrator, return all responses
          if (
            profileData?.role === 'super_admin' ||
            profileData?.role === 'administrator'
          ) {
            console.log('User has admin privileges, fetching all responses');

            // First, get the total count
            const { count: totalCount, error: countError } = await supabase
              .from('form_responses')
              .select('id', { count: 'exact', head: true })
              .eq('form_id', formId);

            if (countError) {
              console.error('Error counting responses:', countError);
              throw countError;
            }

            console.log(`Total form responses count: ${totalCount || 0}`);

            // If we have more than 1000 responses, we need to paginate
            if (totalCount && totalCount > 1000) {
              console.log(
                `Found ${totalCount} responses, using pagination to fetch all`
              );

              // Initialize responses array
              let allResponses: any[] = [];
              const PAGE_SIZE = 1000;
              const totalPages = Math.ceil(totalCount / PAGE_SIZE);

              // Fetch responses in chunks
              for (let page = 0; page < totalPages; page++) {
                const from = page * PAGE_SIZE;
                const to = from + PAGE_SIZE - 1;

                console.log(
                  `Fetching form responses page ${page + 1}/${totalPages} (range: ${from}-${to})`
                );

                // Add retry logic for page fetching
                let pageData = null;
                let pageError = null;
                let retryCount = 0;
                const MAX_RETRIES = 3;

                while (retryCount < MAX_RETRIES && !pageData) {
                  try {
                    const result = await supabase
                      .from('form_responses')
                      .select('*')
                      .eq('form_id', formId)
                      .order('submitted_at', { ascending: false })
                      .range(from, to);

                    pageData = result.data;
                    pageError = result.error;

                    if (pageError) {
                      console.error(
                        `Error fetching page ${page + 1} (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
                        pageError
                      );

                      // Print more details if available
                      if (pageError.message) {
                        console.error(`Error message: ${pageError.message}`);
                      }
                      if (pageError.code) {
                        console.error(`Error code: ${pageError.code}`);
                      }
                      if (pageError.details) {
                        console.error(
                          `Error details: ${JSON.stringify(pageError.details)}`
                        );
                      }

                      // Reset pageData to ensure retry
                      pageData = null;
                      retryCount++;

                      // Wait before retrying
                      if (retryCount < MAX_RETRIES) {
                        const delay = Math.pow(2, retryCount) * 500; // Exponential backoff
                        console.log(`Retrying in ${delay}ms...`);
                        await new Promise((resolve) =>
                          setTimeout(resolve, delay)
                        );
                      }
                    }
                  } catch (error) {
                    console.error(
                      `Unexpected error fetching page ${page + 1} (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
                      error
                    );
                    retryCount++;

                    // Wait before retrying
                    if (retryCount < MAX_RETRIES) {
                      const delay = Math.pow(2, retryCount) * 500; // Exponential backoff
                      console.log(`Retrying in ${delay}ms...`);
                      await new Promise((resolve) =>
                        setTimeout(resolve, delay)
                      );
                    }
                  }
                }

                if (pageError || !pageData) {
                  console.error(
                    `Failed to fetch page ${page + 1} after ${MAX_RETRIES} attempts`
                  );
                  // Continue with next page instead of failing entire operation
                  continue;
                }

                if (pageData && pageData.length > 0) {
                  allResponses = [...allResponses, ...pageData];
                  console.log(
                    `Added ${pageData.length} responses from page ${page + 1}, total: ${allResponses.length} of ${totalCount}`
                  );
                } else {
                  console.log(`No data found on page ${page + 1}`);
                }
              }

              console.log(
                `Completed pagination, retrieved ${allResponses.length} of ${totalCount} responses`
              );
              return allResponses;
            } else {
              // For smaller datasets, use a single query
              const { data, error } = await supabase
                .from('form_responses')
                .select('*')
                .eq('form_id', formId)
                .order('submitted_at', { ascending: false });

              if (error) {
                console.error('Error fetching all responses:', error);
                throw error;
              }

              console.log(`Found ${data?.length || 0} responses for admin`);
              return data;
            }
          }

          // Check if user is institution coordinator
          if (profileData?.role === 'institution_coordinator') {
            console.log(
              'User is institution coordinator, checking access rights'
            );

            // Get the form to check its institution
            const { data: formData, error: formError } = await supabase
              .from('forms')
              .select('institution_id')
              .eq('id', formId)
              .single();

            if (formError) {
              console.error('Error fetching form institution:', formError);
              throw formError;
            }

            // Get user's institution from institution_coordinators table
            const { data: coordData, error: coordError } = await supabase
              .from('institution_coordinators')
              .select('institution_id')
              .eq('user_id', user.id)
              .single();

            if (coordError) {
              console.error(
                'Error fetching coordinator institution:',
                coordError
              );
              throw new Error('Unable to verify coordinator institution');
            }

            // Check if form belongs to coordinator's institution
            if (formData.institution_id === coordData.institution_id) {
              console.log(
                'Institution coordinator accessing institution form responses'
              );

              // First, get the total count
              const { count: totalCount, error: countError } = await supabase
                .from('form_responses')
                .select('id', { count: 'exact', head: true })
                .eq('form_id', formId);

              if (countError) {
                console.error(
                  'Error counting responses for institution coordinator:',
                  countError
                );
                throw countError;
              }

              console.log(
                `Institution coordinator - Total form responses: ${totalCount || 0}`
              );

              // If we have more than 1000 responses, we need to paginate
              if (totalCount && totalCount > 1000) {
                console.log(
                  `Found ${totalCount} responses, using pagination for institution coordinator`
                );

                // Initialize responses array
                let allResponses: any[] = [];
                const PAGE_SIZE = 1000;
                const totalPages = Math.ceil(totalCount / PAGE_SIZE);

                // Fetch responses in chunks
                for (let page = 0; page < totalPages; page++) {
                  const from = page * PAGE_SIZE;
                  const to = from + PAGE_SIZE - 1;

                  // Add retry logic for page fetching
                  let pageData = null;
                  let pageError = null;
                  let retryCount = 0;
                  const MAX_RETRIES = 3;

                  while (retryCount < MAX_RETRIES && !pageData) {
                    try {
                      const result = await supabase
                        .from('form_responses')
                        .select('*')
                        .eq('form_id', formId)
                        .order('submitted_at', { ascending: false })
                        .range(from, to);

                      pageData = result.data;
                      pageError = result.error;

                      if (pageError) {
                        console.error(
                          `Error fetching page ${page + 1} for institution coordinator (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
                          pageError
                        );

                        // Print more details if available
                        if (pageError.message) {
                          console.error(`Error message: ${pageError.message}`);
                        }
                        if (pageError.code) {
                          console.error(`Error code: ${pageError.code}`);
                        }
                        if (pageError.details) {
                          console.error(
                            `Error details: ${JSON.stringify(pageError.details)}`
                          );
                        }

                        // Reset pageData to ensure retry
                        pageData = null;
                        retryCount++;

                        // Wait before retrying
                        if (retryCount < MAX_RETRIES) {
                          const delay = Math.pow(2, retryCount) * 500; // Exponential backoff
                          console.log(`Retrying in ${delay}ms...`);
                          await new Promise((resolve) =>
                            setTimeout(resolve, delay)
                          );
                        }
                      }
                    } catch (error) {
                      console.error(
                        `Unexpected error fetching page ${page + 1} for institution coordinator (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
                        error
                      );
                      retryCount++;

                      // Wait before retrying
                      if (retryCount < MAX_RETRIES) {
                        const delay = Math.pow(2, retryCount) * 500; // Exponential backoff
                        console.log(`Retrying in ${delay}ms...`);
                        await new Promise((resolve) =>
                          setTimeout(resolve, delay)
                        );
                      }
                    }
                  }

                  if (pageError || !pageData) {
                    console.error(
                      `Failed to fetch page ${page + 1} for institution coordinator after ${MAX_RETRIES} attempts`
                    );
                    // Continue with next page instead of failing entire operation
                    continue;
                  }

                  if (pageData && pageData.length > 0) {
                    allResponses = [...allResponses, ...pageData];
                    console.log(
                      `Added ${pageData.length} responses for institution coordinator, total: ${allResponses.length} of ${totalCount}`
                    );
                  } else {
                    console.log(
                      `No data found on page ${page + 1} for institution coordinator`
                    );
                  }
                }

                return allResponses;
              } else {
                // For smaller datasets, use a single query
                const { data, error } = await supabase
                  .from('form_responses')
                  .select('*')
                  .eq('form_id', formId)
                  .order('submitted_at', { ascending: false });

                if (error) {
                  console.error(
                    'Error fetching responses for institution coordinator:',
                    error
                  );
                  throw error;
                }

                console.log(
                  `Found ${data?.length || 0} responses for institution coordinator`
                );
                return data;
              }
            } else {
              console.error(
                'Institution coordinator tried to access responses from different institution'
              );
              throw new Error(
                'You do not have permission to view these responses'
              );
            }
          }

          // Check if user is an event coordinator
          if (profileData?.role === 'event_coordinator') {
            console.log('User is event coordinator, checking access rights');

            // Get the form to check its event_id
            const { data: formData, error: formError } = await supabase
              .from('forms')
              .select('event_id')
              .eq('id', formId)
              .single();

            if (formError) {
              console.error('Error fetching form event:', formError);
              throw formError;
            }

            if (!formData.event_id) {
              console.error('Form does not have an associated event');
              throw new Error('This form is not associated with any event');
            }

            // FIRST: Check if user is directly assigned to this event via event_coordinators table
            const { data: eventCoordData, error: eventCoordError } =
              await supabase
                .from('event_coordinators')
                .select('*')
                .eq('event_id', formData.event_id)
                .eq('user_id', user.id)
                .maybeSingle();

            console.log('Event coordinator assignment check for form access:', {
              isAssignedCoordinator: !!eventCoordData,
              data: eventCoordData,
              error: eventCoordError
            });

            if (eventCoordData) {
              console.log(
                'User is assigned as event coordinator via event_coordinators table, granting form access'
              );

              // First, get the total count
              const { count: totalCount, error: countError } = await supabase
                .from('form_responses')
                .select('id', { count: 'exact', head: true })
                .eq('form_id', formId);

              if (countError) {
                console.error(
                  'Error counting responses for assigned event coordinator:',
                  countError
                );
                throw countError;
              }

              console.log(
                `Assigned event coordinator - Total form responses: ${totalCount || 0}`
              );

              // If we have more than 1000 responses, we need to paginate
              if (totalCount && totalCount > 1000) {
                console.log(
                  `Found ${totalCount} responses, using pagination for assigned event coordinator`
                );

                let allResponses: any[] = [];
                const PAGE_SIZE = 1000;
                const totalPages = Math.ceil(totalCount / PAGE_SIZE);

                for (let page = 0; page < totalPages; page++) {
                  const from = page * PAGE_SIZE;
                  const to = from + PAGE_SIZE - 1;

                  let pageData = null;
                  let pageError = null;
                  let retryCount = 0;
                  const MAX_RETRIES = 3;

                  while (retryCount < MAX_RETRIES && !pageData) {
                    try {
                      const result = await supabase
                        .from('form_responses')
                        .select('*')
                        .eq('form_id', formId)
                        .order('submitted_at', { ascending: false })
                        .range(from, to);

                      pageData = result.data;
                      pageError = result.error;

                      if (pageError) {
                        pageData = null;
                        retryCount++;

                        if (retryCount < MAX_RETRIES) {
                          const delay = Math.pow(2, retryCount) * 500;
                          await new Promise((resolve) =>
                            setTimeout(resolve, delay)
                          );
                        }
                      }
                    } catch (error) {
                      retryCount++;

                      if (retryCount < MAX_RETRIES) {
                        const delay = Math.pow(2, retryCount) * 500;
                        await new Promise((resolve) =>
                          setTimeout(resolve, delay)
                        );
                      }
                    }
                  }

                  if (pageData && pageData.length > 0) {
                    allResponses = [...allResponses, ...pageData];
                  }
                }

                return allResponses;
              } else {
                const { data, error } = await supabase
                  .from('form_responses')
                  .select('*')
                  .eq('form_id', formId)
                  .order('submitted_at', { ascending: false });

                if (error) {
                  console.error(
                    'Error fetching responses for assigned event coordinator:',
                    error
                  );
                  throw error;
                }

                console.log(
                  `Found ${data?.length || 0} responses for assigned event coordinator`
                );
                return data;
              }
            }

            // Check if user is the coordinator for this event (via the event's coordinator_id field)
            const { data: eventData, error: eventError } = await supabase
              .from('events')
              .select('coordinator_id')
              .eq('id', formData.event_id)
              .single();

            if (eventError) {
              console.error('Error fetching event coordinator:', eventError);
              throw new Error('Unable to verify event coordinator');
            }

            // Check if user is the event coordinator
            if (eventData.coordinator_id === user.id) {
              console.log('Event coordinator accessing event form responses');

              // First, get the total count
              const { count: totalCount, error: countError } = await supabase
                .from('form_responses')
                .select('id', { count: 'exact', head: true })
                .eq('form_id', formId);

              if (countError) {
                console.error(
                  'Error counting responses for event coordinator:',
                  countError
                );
                throw countError;
              }

              console.log(
                `Event coordinator - Total form responses: ${totalCount || 0}`
              );

              // If we have more than 1000 responses, we need to paginate
              if (totalCount && totalCount > 1000) {
                console.log(
                  `Found ${totalCount} responses, using pagination for event coordinator`
                );

                // Initialize responses array
                let allResponses: any[] = [];
                const PAGE_SIZE = 1000;
                const totalPages = Math.ceil(totalCount / PAGE_SIZE);

                // Fetch responses in chunks
                for (let page = 0; page < totalPages; page++) {
                  const from = page * PAGE_SIZE;
                  const to = from + PAGE_SIZE - 1;

                  // Add retry logic for page fetching
                  let pageData = null;
                  let pageError = null;
                  let retryCount = 0;
                  const MAX_RETRIES = 3;

                  while (retryCount < MAX_RETRIES && !pageData) {
                    try {
                      const result = await supabase
                        .from('form_responses')
                        .select('*')
                        .eq('form_id', formId)
                        .order('submitted_at', { ascending: false })
                        .range(from, to);

                      pageData = result.data;
                      pageError = result.error;

                      if (pageError) {
                        console.error(
                          `Error fetching page ${page + 1} for event coordinator (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
                          pageError
                        );

                        // Print more details if available
                        if (pageError.message) {
                          console.error(`Error message: ${pageError.message}`);
                        }
                        if (pageError.code) {
                          console.error(`Error code: ${pageError.code}`);
                        }
                        if (pageError.details) {
                          console.error(
                            `Error details: ${JSON.stringify(pageError.details)}`
                          );
                        }

                        // Reset pageData to ensure retry
                        pageData = null;
                        retryCount++;

                        // Wait before retrying
                        if (retryCount < MAX_RETRIES) {
                          const delay = Math.pow(2, retryCount) * 500; // Exponential backoff
                          console.log(`Retrying in ${delay}ms...`);
                          await new Promise((resolve) =>
                            setTimeout(resolve, delay)
                          );
                        }
                      }
                    } catch (error) {
                      console.error(
                        `Unexpected error fetching page ${page + 1} for event coordinator (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
                        error
                      );
                      retryCount++;

                      // Wait before retrying
                      if (retryCount < MAX_RETRIES) {
                        const delay = Math.pow(2, retryCount) * 500; // Exponential backoff
                        console.log(`Retrying in ${delay}ms...`);
                        await new Promise((resolve) =>
                          setTimeout(resolve, delay)
                        );
                      }
                    }
                  }

                  if (pageError || !pageData) {
                    console.error(
                      `Failed to fetch page ${page + 1} for event coordinator after ${MAX_RETRIES} attempts`
                    );
                    // Continue with next page instead of failing entire operation
                    continue;
                  }

                  if (pageData && pageData.length > 0) {
                    allResponses = [...allResponses, ...pageData];
                    console.log(
                      `Added ${pageData.length} responses for event coordinator, total: ${allResponses.length} of ${totalCount}`
                    );
                  } else {
                    console.log(
                      `No data found on page ${page + 1} for event coordinator`
                    );
                  }
                }

                return allResponses;
              } else {
                // For smaller datasets, use a single query
                const { data, error } = await supabase
                  .from('form_responses')
                  .select('*')
                  .eq('form_id', formId)
                  .order('submitted_at', { ascending: false });

                if (error) {
                  console.error(
                    'Error fetching responses for event coordinator:',
                    error
                  );
                  throw error;
                }

                console.log(
                  `Found ${data?.length || 0} responses for event coordinator`
                );
                return data;
              }
            } else {
              // Before rejecting the request, check if user is a department coordinator for this event
              console.log(
                'Checking if user is a department coordinator for this event'
              );

              // Get the event information including department
              const { data: eventInfo, error: eventInfoError } = await supabase
                .from('events')
                .select('department_id, institution_id')
                .eq('id', formData.event_id)
                .single();

              if (eventInfoError) {
                console.error(
                  'Error fetching event information:',
                  eventInfoError
                );
                throw new Error(
                  'Unable to verify event department information'
                );
              }

              // Check if event has department and user is coordinator for it
              if (eventInfo.department_id) {
                const { data: deptCoordData, error: deptCoordError } =
                  await supabase
                    .from('department_coordinators')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('department_id', eventInfo.department_id)
                    .maybeSingle();

                if (!deptCoordError && deptCoordData) {
                  console.log(
                    'User is a department coordinator for this event, granting access'
                  );

                  // First, get the total count
                  const { count: totalCount, error: countError } =
                    await supabase
                      .from('form_responses')
                      .select('id', { count: 'exact', head: true })
                      .eq('form_id', formId);

                  if (countError) {
                    console.error(
                      'Error counting responses for department coordinator:',
                      countError
                    );
                    throw countError;
                  }

                  console.log(
                    `Department coordinator - Total form responses: ${totalCount || 0}`
                  );

                  // Use consistent pagination logic as above
                  if (totalCount && totalCount > 1000) {
                    console.log(
                      `Found ${totalCount} responses, using pagination for department coordinator`
                    );

                    // Initialize responses array
                    let allResponses: any[] = [];
                    const PAGE_SIZE = 1000;
                    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

                    // Fetch responses in chunks
                    for (let page = 0; page < totalPages; page++) {
                      const from = page * PAGE_SIZE;
                      const to = from + PAGE_SIZE - 1;

                      // Add retry logic for page fetching
                      let pageData = null;
                      let pageError = null;
                      let retryCount = 0;
                      const MAX_RETRIES = 3;

                      while (retryCount < MAX_RETRIES && !pageData) {
                        try {
                          const result = await supabase
                            .from('form_responses')
                            .select('*')
                            .eq('form_id', formId)
                            .order('submitted_at', { ascending: false })
                            .range(from, to);

                          pageData = result.data;
                          pageError = result.error;

                          if (pageError) {
                            console.error(
                              `Error fetching page ${page + 1} for department coordinator (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
                              pageError
                            );
                            pageData = null;
                            retryCount++;

                            if (retryCount < MAX_RETRIES) {
                              const delay = Math.pow(2, retryCount) * 500;
                              console.log(`Retrying in ${delay}ms...`);
                              await new Promise((resolve) =>
                                setTimeout(resolve, delay)
                              );
                            }
                          }
                        } catch (error) {
                          console.error(
                            `Unexpected error fetching page ${page + 1} for department coordinator (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
                            error
                          );
                          retryCount++;

                          if (retryCount < MAX_RETRIES) {
                            const delay = Math.pow(2, retryCount) * 500;
                            console.log(`Retrying in ${delay}ms...`);
                            await new Promise((resolve) =>
                              setTimeout(resolve, delay)
                            );
                          }
                        }
                      }

                      if (pageError || !pageData) {
                        console.error(
                          `Failed to fetch page ${page + 1} for department coordinator after ${MAX_RETRIES} attempts`
                        );
                        continue;
                      }

                      if (pageData && pageData.length > 0) {
                        allResponses = [...allResponses, ...pageData];
                        console.log(
                          `Added ${pageData.length} responses for department coordinator, total: ${allResponses.length} of ${totalCount}`
                        );
                      } else {
                        console.log(
                          `No data found on page ${page + 1} for department coordinator`
                        );
                      }
                    }

                    return allResponses;
                  } else {
                    // For smaller datasets, use a single query
                    const { data, error } = await supabase
                      .from('form_responses')
                      .select('*')
                      .eq('form_id', formId)
                      .order('submitted_at', { ascending: false });

                    if (error) {
                      console.error(
                        'Error fetching responses for department coordinator:',
                        error
                      );
                      throw error;
                    }

                    console.log(
                      `Found ${data?.length || 0} responses for department coordinator`
                    );
                    return data;
                  }
                }
              } else if (eventInfo.institution_id) {
                // If event has no department, check if user is a department coordinator for ANY department
                // in the event's institution (department coordinators should access all institutional events)
                const { data: userDeptCoords, error: userDeptError } =
                  await supabase
                    .from('department_coordinators')
                    .select('department_id')
                    .eq('user_id', user.id);

                if (
                  !userDeptError &&
                  userDeptCoords &&
                  userDeptCoords.length > 0
                ) {
                  // Get all departments belonging to this institution
                  const { data: instDepts, error: instDeptError } =
                    await supabase
                      .from('departments')
                      .select('id')
                      .eq('institution_id', eventInfo.institution_id);

                  if (!instDeptError && instDepts) {
                    // Check if user coordinates any department in this institution
                    const instDeptIds = instDepts.map((d) => d.id);
                    const userDeptIds = userDeptCoords
                      .map((d) => d.department_id)
                      .filter((id): id is string => id !== null);
                    const isCoordinatorForInst = userDeptIds.some((id) =>
                      instDeptIds.includes(id)
                    );

                    if (isCoordinatorForInst) {
                      console.log(
                        "User is a department coordinator for a department in this event's institution, granting access"
                      );

                      // First, get the total count
                      const { count: totalCount, error: countError } =
                        await supabase
                          .from('form_responses')
                          .select('id', { count: 'exact', head: true })
                          .eq('form_id', formId);

                      if (countError) {
                        console.error(
                          'Error counting responses for department coordinator:',
                          countError
                        );
                        throw countError;
                      }

                      console.log(
                        `Department coordinator - Total form responses: ${totalCount || 0}`
                      );

                      // Use consistent pagination logic as above
                      if (totalCount && totalCount > 1000) {
                        console.log(
                          `Found ${totalCount} responses, using pagination for department coordinator`
                        );

                        // Initialize responses array
                        let allResponses: any[] = [];
                        const PAGE_SIZE = 1000;
                        const totalPages = Math.ceil(totalCount / PAGE_SIZE);

                        // Fetch responses in chunks (reused pagination code)
                        for (let page = 0; page < totalPages; page++) {
                          const from = page * PAGE_SIZE;
                          const to = from + PAGE_SIZE - 1;

                          let pageData = null;
                          let pageError = null;
                          let retryCount = 0;
                          const MAX_RETRIES = 3;

                          while (retryCount < MAX_RETRIES && !pageData) {
                            try {
                              const result = await supabase
                                .from('form_responses')
                                .select('*')
                                .eq('form_id', formId)
                                .order('submitted_at', { ascending: false })
                                .range(from, to);

                              pageData = result.data;
                              pageError = result.error;

                              if (pageError) {
                                pageData = null;
                                retryCount++;

                                if (retryCount < MAX_RETRIES) {
                                  const delay = Math.pow(2, retryCount) * 500;
                                  await new Promise((resolve) =>
                                    setTimeout(resolve, delay)
                                  );
                                }
                              }
                            } catch (error) {
                              retryCount++;

                              if (retryCount < MAX_RETRIES) {
                                const delay = Math.pow(2, retryCount) * 500;
                                await new Promise((resolve) =>
                                  setTimeout(resolve, delay)
                                );
                              }
                            }
                          }

                          if (pageData && pageData.length > 0) {
                            allResponses = [...allResponses, ...pageData];
                          }
                        }

                        return allResponses;
                      } else {
                        // For smaller datasets, use a single query
                        const { data, error } = await supabase
                          .from('form_responses')
                          .select('*')
                          .eq('form_id', formId)
                          .order('submitted_at', { ascending: false });

                        if (error) throw error;
                        return data;
                      }
                    }
                  }
                }
              }

              // Also check if user is an institution coordinator for this event
              if (eventInfo.institution_id) {
                const { data: instCoordData, error: instCoordError } =
                  await supabase
                    .from('institution_coordinators')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('institution_id', eventInfo.institution_id)
                    .maybeSingle();

                if (!instCoordError && instCoordData) {
                  console.log(
                    'User is an institution coordinator for this event, granting access'
                  );

                  // Use the same pagination logic for fetching responses
                  const { count: totalCount, error: countError } =
                    await supabase
                      .from('form_responses')
                      .select('id', { count: 'exact', head: true })
                      .eq('form_id', formId);

                  if (countError) {
                    console.error(
                      'Error counting responses for institution coordinator:',
                      countError
                    );
                    throw countError;
                  }

                  if (totalCount && totalCount > 1000) {
                    let allResponses: any[] = [];
                    const PAGE_SIZE = 1000;
                    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

                    for (let page = 0; page < totalPages; page++) {
                      const from = page * PAGE_SIZE;
                      const to = from + PAGE_SIZE - 1;

                      let pageData = null;
                      let pageError = null;
                      let retryCount = 0;
                      const MAX_RETRIES = 3;

                      while (retryCount < MAX_RETRIES && !pageData) {
                        try {
                          const result = await supabase
                            .from('form_responses')
                            .select('*')
                            .eq('form_id', formId)
                            .order('submitted_at', { ascending: false })
                            .range(from, to);

                          pageData = result.data;
                          pageError = result.error;

                          if (pageError) {
                            pageData = null;
                            retryCount++;

                            if (retryCount < MAX_RETRIES) {
                              const delay = Math.pow(2, retryCount) * 500;
                              await new Promise((resolve) =>
                                setTimeout(resolve, delay)
                              );
                            }
                          }
                        } catch (error) {
                          retryCount++;

                          if (retryCount < MAX_RETRIES) {
                            const delay = Math.pow(2, retryCount) * 500;
                            await new Promise((resolve) =>
                              setTimeout(resolve, delay)
                            );
                          }
                        }
                      }

                      if (pageData && pageData.length > 0) {
                        allResponses = [...allResponses, ...pageData];
                      }
                    }

                    return allResponses;
                  } else {
                    const { data, error } = await supabase
                      .from('form_responses')
                      .select('*')
                      .eq('form_id', formId)
                      .order('submitted_at', { ascending: false });

                    if (error) throw error;
                    return data;
                  }
                }
              }

              // If we get here, user is not authorized
              console.error(
                'Event coordinator tried to access responses for an event they do not coordinate'
              );
              throw new Error(
                'You do not have permission to view these responses'
              );
            }
          }
        }
      }

      // For form creators
      // If user is the form creator, return all responses
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('created_by')
        .eq('id', formId)
        .single();

      if (formError) {
        console.error('Error fetching form data:', formError);
        throw formError;
      }

      // If user is the form creator, return all responses
      if (formData.created_by === user?.id) {
        console.log('User is form creator, fetching all responses');

        // First, get the total count
        const { count: totalCount, error: countError } = await supabase
          .from('form_responses')
          .select('id', { count: 'exact', head: true })
          .eq('form_id', formId);

        if (countError) {
          console.error(
            'Error counting responses for form creator:',
            countError
          );
          throw countError;
        }

        console.log(`Form creator - Total form responses: ${totalCount || 0}`);

        // If we have more than 1000 responses, we need to paginate
        if (totalCount && totalCount > 1000) {
          console.log(
            `Found ${totalCount} responses, using pagination for form creator`
          );

          // Initialize responses array
          let allResponses: any[] = [];
          const PAGE_SIZE = 1000;
          const totalPages = Math.ceil(totalCount / PAGE_SIZE);

          // Fetch responses in chunks
          for (let page = 0; page < totalPages; page++) {
            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            // Add retry logic for page fetching
            let pageData = null;
            let pageError = null;
            let retryCount = 0;
            const MAX_RETRIES = 3;

            while (retryCount < MAX_RETRIES && !pageData) {
              try {
                const result = await supabase
                  .from('form_responses')
                  .select('*')
                  .eq('form_id', formId)
                  .order('submitted_at', { ascending: false })
                  .range(from, to);

                pageData = result.data;
                pageError = result.error;

                if (pageError) {
                  console.error(
                    `Error fetching page ${page + 1} for form creator (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
                    pageError
                  );

                  // Print more details if available
                  if (pageError.message) {
                    console.error(`Error message: ${pageError.message}`);
                  }
                  if (pageError.code) {
                    console.error(`Error code: ${pageError.code}`);
                  }
                  if (pageError.details) {
                    console.error(
                      `Error details: ${JSON.stringify(pageError.details)}`
                    );
                  }

                  // Reset pageData to ensure retry
                  pageData = null;
                  retryCount++;

                  // Wait before retrying
                  if (retryCount < MAX_RETRIES) {
                    const delay = Math.pow(2, retryCount) * 500; // Exponential backoff
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                  }
                }
              } catch (error) {
                console.error(
                  `Unexpected error fetching page ${page + 1} for form creator (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
                  error
                );
                retryCount++;

                // Wait before retrying
                if (retryCount < MAX_RETRIES) {
                  const delay = Math.pow(2, retryCount) * 500; // Exponential backoff
                  console.log(`Retrying in ${delay}ms...`);
                  await new Promise((resolve) => setTimeout(resolve, delay));
                }
              }
            }

            if (pageError || !pageData) {
              console.error(
                `Failed to fetch page ${page + 1} for form creator after ${MAX_RETRIES} attempts`
              );
              // Continue with next page instead of failing entire operation
              continue;
            }

            if (pageData && pageData.length > 0) {
              allResponses = [...allResponses, ...pageData];
              console.log(
                `Added ${pageData.length} responses for form creator, total: ${allResponses.length} of ${totalCount}`
              );
            } else {
              console.log(`No data found on page ${page + 1} for form creator`);
            }
          }

          return allResponses;
        } else {
          // For smaller datasets, use a single query
          const { data, error } = await supabase
            .from('form_responses')
            .select('*')
            .eq('form_id', formId)
            .order('submitted_at', { ascending: false });

          if (error) {
            console.error('Error fetching responses for form creator:', error);
            throw error;
          }

          console.log(`Found ${data?.length || 0} responses for form creator`);
          return data;
        }
      }

      // Otherwise, only return responses created by the current user
      console.log('User has limited privileges, fetching only their responses');

      // For regular users, pagination is less likely to be needed but still possible
      const { count: userTotalCount, error: userCountError } = await supabase
        .from('form_responses')
        .select('id', { count: 'exact', head: true })
        .eq('form_id', formId)
        .eq('submitted_by', user?.id as string);

      if (userCountError) {
        console.error('Error counting user responses:', userCountError);
        throw userCountError;
      }

      console.log(`User's total form responses: ${userTotalCount || 0}`);

      // If we have more than 1000 responses (unlikely for a single user but possible), paginate
      if (userTotalCount && userTotalCount > 1000) {
        console.log(`Found ${userTotalCount} user responses, using pagination`);

        // Initialize responses array
        let allUserResponses: any[] = [];
        const PAGE_SIZE = 1000;
        const totalPages = Math.ceil(userTotalCount / PAGE_SIZE);

        // Fetch responses in chunks
        for (let page = 0; page < totalPages; page++) {
          const from = page * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;

          const { data: pageData, error: pageError } = await supabase
            .from('form_responses')
            .select('*')
            .eq('form_id', formId)
            .eq('submitted_by', user?.id as string)
            .order('submitted_at', { ascending: false })
            .range(from, to);

          if (pageError) {
            console.error(
              `Error fetching user responses page ${page + 1}:`,
              pageError
            );
            continue;
          }

          if (pageData && pageData.length > 0) {
            allUserResponses = [...allUserResponses, ...pageData];
            console.log(
              `Added ${pageData.length} user responses, total: ${allUserResponses.length}`
            );
          }
        }

        return allUserResponses;
      } else {
        // For smaller datasets, use a single query
        const { data, error } = await supabase
          .from('form_responses')
          .select('*')
          .eq('form_id', formId)
          .eq('submitted_by', user?.id as string)
          .order('submitted_at', { ascending: false });

        if (error) {
          console.error('Error fetching user responses:', error);
          throw error;
        }

        console.log(`Found ${data?.length || 0} user responses`);
        return data;
      }
    } catch (error) {
      console.error('Unexpected error in getFormResponses:', error);
      throw error;
    }
  },

  async getFormResponseBySubmissionId(
    submissionId: string,
    user?: { id: string; role?: string }
  ) {
    const supabase = createClientSupabaseClient();

    console.log('getFormResponseBySubmissionId called with:', {
      submissionId,
      user
    });

    try {
      // First check if the user has admin privileges
      if (user?.id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        } else {
          console.log('User profile data for response details:', profileData);

          // If user is super_admin or administrator, proceed with direct query
          if (
            profileData?.role === 'super_admin' ||
            profileData?.role === 'administrator'
          ) {
            console.log('User has admin privileges, fetching response');
          } else if (profileData?.role === 'institution_coordinator') {
            // For institution coordinators, need to check their institution
            console.log(
              'User is institution coordinator, checking access rights'
            );

            // Get the coordinator's institution
            const { data: coordData, error: coordError } = await supabase
              .from('institution_coordinators')
              .select('institution_id')
              .eq('user_id', user.id)
              .single();

            if (coordError) {
              console.error(
                'Error fetching coordinator institution:',
                coordError
              );
              throw new Error('Unable to verify coordinator institution');
            }

            // Do a preliminary check if this response is for a form from their institution
            const { data: checkData, error: checkError } = await supabase
              .from('form_responses')
              .select(
                `
                id,
                form:forms(
                  id,
                  institution_id
                )
              `
              )
              .eq('submission_id', submissionId)
              .single();

            if (checkError) {
              console.error('Error checking response institution:', checkError);
              throw new Error('Unable to verify response institution');
            }

            const formData = checkData?.form as unknown as {
              id: string;
              institution_id: string;
            };
            if (formData?.institution_id !== coordData.institution_id) {
              console.error(
                'Institution coordinator tried to access response from different institution'
              );
              throw new Error(
                'You do not have permission to view this response'
              );
            }
          } else if (profileData?.role === 'event_coordinator') {
            // For event coordinators, check if this is for an event they coordinate
            console.log('User is event coordinator, checking access rights');

            // Do a preliminary check to get the event_id associated with this form response
            const { data: checkData, error: checkError } = await supabase
              .from('form_responses')
              .select(
                `
                id,
                form:forms(
                  id,
                  event_id
                )
              `
              )
              .eq('submission_id', submissionId)
              .single();

            if (checkError) {
              console.error('Error checking response event:', checkError);
              throw new Error('Unable to verify response event');
            }

            const formData = checkData?.form as unknown as {
              id: string;
              event_id: string;
            };
            if (!formData?.event_id) {
              console.error('Form does not have an associated event');
              throw new Error('This form is not associated with any event');
            }

            // FIRST: Check if user is directly assigned to this event via event_coordinators table
            const { data: eventCoordCheckData, error: eventCoordCheckError } =
              await supabase
                .from('event_coordinators')
                .select('*')
                .eq('event_id', formData.event_id)
                .eq('user_id', user.id)
                .maybeSingle();

            console.log(
              'Event coordinator assignment check for response detail:',
              {
                isAssignedCoordinator: !!eventCoordCheckData,
                data: eventCoordCheckData,
                error: eventCoordCheckError
              }
            );

            // If user is assigned as coordinator via event_coordinators, allow access
            if (eventCoordCheckData) {
              console.log(
                'User is assigned as event coordinator via event_coordinators table, granting response access'
              );
              // Will proceed to final query below
            } else {
              // Check if user is the coordinator for this event via coordinator_id field
              const { data: eventData, error: eventError } = await supabase
                .from('events')
                .select('coordinator_id, department_id, institution_id')
                .eq('id', formData.event_id)
                .single();

              if (eventError) {
                console.error('Error fetching event coordinator:', eventError);
                throw new Error('Unable to verify event coordinator');
              }

              // Check if user is the event coordinator via coordinator_id
              if (eventData.coordinator_id === user.id) {
                console.log(
                  'Event coordinator accessing event form response via coordinator_id'
                );
                // Will proceed to final query below
              } else {
                // Check if user is a department coordinator for this event
                let isAuthorized = false;

                if (eventData.department_id) {
                  const { data: deptCoordData } = await supabase
                    .from('department_coordinators')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('department_id', eventData.department_id)
                    .maybeSingle();

                  if (deptCoordData) {
                    console.log(
                      'User is a department coordinator for this event'
                    );
                    isAuthorized = true;
                  }
                }

                // Check if user is an institution coordinator for this event
                if (!isAuthorized && eventData.institution_id) {
                  const { data: instCoordData } = await supabase
                    .from('institution_coordinators')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('institution_id', eventData.institution_id)
                    .maybeSingle();

                  if (instCoordData) {
                    console.log(
                      'User is an institution coordinator for this event'
                    );
                    isAuthorized = true;
                  }
                }

                if (!isAuthorized) {
                  console.error(
                    'Event coordinator tried to access response for an event they do not coordinate'
                  );
                  throw new Error(
                    'You do not have permission to view this response'
                  );
                }
              }
            }
          }
        }
      }

      // Proceed with query - RLS will handle permissions at the database level
      const { data, error } = await supabase
        .from('form_responses')
        .select(
          `
          *,
          form:forms!inner(
            id,
            title,
            description,
            banner_url,
            event_id,
            institution_id
          )
        `
        )
        .eq('submission_id', submissionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in getFormResponseBySubmissionId:', error);
      throw error;
    }
  },

  async deleteFormResponse(responseId: string) {
    const supabase = createClientSupabaseClient();

    const { error } = await supabase
      .from('form_responses')
      .delete()
      .eq('id', responseId);

    if (error) {
      console.error('Error deleting form response:', error);
      throw error;
    }

    return { success: true };
  },

  async getTemplate(templateId: string) {
    const supabase = createClientSupabaseClient();

    // First try to get from form_templates table
    const { data: template, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      // If not found in templates, check predefined templates
      const predefinedTemplates = {
        'event-registration': {
          title: 'Event Registration Form',
          description: 'Basic event registration form template',
          banner_url: null,
          fields: [
            {
              id: uuidv4(),
              type: 'text',
              label: 'Full Name',
              required: true,
              placeholder: 'Enter your full name'
            },
            {
              id: uuidv4(),
              type: 'email',
              label: 'Email Address',
              required: true,
              placeholder: 'Enter your email address'
            },
            {
              id: uuidv4(),
              type: 'text',
              label: 'Phone Number',
              required: true,
              placeholder: 'Enter your phone number'
            }
          ] as FormField[]
        },
        'workshop-registration': {
          title: 'Workshop Registration Form',
          description: 'Detailed workshop registration form template',
          banner_url: null,
          fields: [
            {
              id: uuidv4(),
              type: 'text',
              label: 'Full Name',
              required: true,
              placeholder: 'Enter your full name'
            },
            {
              id: uuidv4(),
              type: 'email',
              label: 'Email Address',
              required: true,
              placeholder: 'Enter your email address'
            },
            {
              id: uuidv4(),
              type: 'select',
              label: 'Experience Level',
              required: true,
              options: ['Beginner', 'Intermediate', 'Advanced']
            },
            {
              id: uuidv4(),
              type: 'textarea',
              label: 'What do you hope to learn?',
              required: false,
              placeholder: 'Tell us your learning objectives'
            }
          ] as FormField[]
        }
      };

      return predefinedTemplates[
        templateId as keyof typeof predefinedTemplates
      ];
    }

    return template;
  },

  async createTemplate(template: {
    title: string;
    description: string;
    category: string;
    fields: FormField[];
    banner_url?: string;
  }) {
    const supabase = createClientSupabaseClient();

    // Get current user
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('form_templates')
      .insert([
        {
          title: template.title,
          description: template.description,
          category: template.category,
          fields: template.fields as any,
          banner_url: template.banner_url,
          created_by: user.id
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCustomTemplates() {
    const supabase = createClientSupabaseClient();

    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};
