// lib/mcp/tools.ts
// All MCP tool registrations for JKKN AI Forms
// Each tool is a thin wrapper over existing services — no business logic duplication

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { extractAuth, hasMinimumRole } from '@/lib/mcp/auth';
import { toolSuccess, toolError, createMcpSupabaseClient } from '@/lib/mcp/helpers';

// Shared Zod schema for form fields (used by create and update tools)
const formFieldSchema = z.object({
  id: z.string().optional().describe('Existing field ID (omit for new fields)'),
  type: z
    .enum([
      'text',
      'number',
      'email',
      'textarea',
      'select',
      'checkbox',
      'radio',
      'date',
      'time',
    ])
    .describe('Field type'),
  label: z.string().describe('Field label shown to respondents'),
  required: z.boolean().default(true).describe('Whether field is required'),
  placeholder: z.string().optional().describe('Placeholder text'),
  options: z
    .array(z.string())
    .optional()
    .describe('Options for select/radio/checkbox fields'),
});

export function registerTools(server: McpServer) {
  // ═══════════════════════════════════════════════════════════════
  //  DASHBOARD
  // ═══════════════════════════════════════════════════════════════

  server.tool(
    'get_dashboard',
    'Get aggregate statistics — total institutional forms, personal forms, events, and form responses. Scoped to the authenticated user via RLS.',
    {},
    async (_args, extra) => {
      try {
        const { token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);

        const [formsResult, personalFormsResult, eventsResult, responsesResult] =
          await Promise.all([
            supabase.from('forms').select('id', { count: 'exact', head: true }),
            supabase
              .from('personal_forms')
              .select('id', { count: 'exact', head: true }),
            supabase.from('events').select('id', { count: 'exact', head: true }),
            supabase
              .from('personal_form_responses')
              .select('id', { count: 'exact', head: true }),
          ]);

        return toolSuccess({
          institutional_forms: formsResult.count || 0,
          personal_forms: personalFormsResult.count || 0,
          events: eventsResult.count || 0,
          total_responses: responsesResult.count || 0,
        });
      } catch (error) {
        return toolError('Failed to get dashboard stats', error);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  //  PERSONAL FORMS — CRUD
  // ═══════════════════════════════════════════════════════════════

  server.tool(
    'create_personal_form',
    'Create a new personal form with specified fields. Each field needs a type (text, number, email, textarea, select, checkbox, radio, date, time) and a label. For select/radio/checkbox fields, provide an options array. Returns the created form with its public URL.',
    {
      title: z.string().min(1).describe('Form title'),
      description: z.string().optional().describe('Form description'),
      fields: z
        .array(formFieldSchema)
        .min(1)
        .describe('Form fields — at least one required'),
      is_public: z
        .boolean()
        .default(true)
        .describe('Whether form is publicly accessible'),
      status: z
        .enum(['draft', 'published'])
        .default('published')
        .describe('Form status — publish immediately or save as draft'),
      submission_limit: z
        .number()
        .optional()
        .describe('Maximum number of submissions allowed (omit for unlimited)'),
      restrict_domain: z
        .boolean()
        .default(false)
        .describe('Restrict submissions to specific email domains'),
      allowed_domains: z
        .array(z.string())
        .optional()
        .describe(
          'Allowed email domains when restrict_domain is true (e.g. ["jkkn.ac.in"])'
        ),
    },
    async (args, extra) => {
      try {
        const { userId, token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);

        const fields = args.fields.map((f, i) => ({
          id: f.id || `field_${Date.now()}_${i}`,
          ...f,
        }));

        const { PersonalFormService } = await import(
          '@/lib/services/personal-form-service'
        );
        const form = await PersonalFormService.createPersonalForm(
          {
            title: args.title,
            description: args.description || '',
            fields,
            status: args.status,
            is_public: args.is_public,
            submission_limit: args.submission_limit,
            restrict_domain: args.restrict_domain,
            allowed_domains: args.allowed_domains || [],
            enable_user_autofetch: false,
            require_institutional_profile: false,
            allow_manual_entry_fallback: false,
            created_by: userId,
          },
          supabase
        );

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          'https://ai-forms.jicate.solutions';
        return toolSuccess({
          id: form.id,
          title: form.title,
          slug: form.slug,
          status: form.status,
          public_url: `${appUrl}/forms/public/${form.id}`,
          field_count: fields.length,
          message: `Form "${form.title}" created successfully`,
        });
      } catch (error) {
        return toolError('Failed to create form', error);
      }
    }
  );

  server.tool(
    'list_personal_forms',
    'List all personal forms owned by or shared with the current user. Shows title, status, response count, and creation date.',
    {
      status: z
        .enum(['draft', 'published', 'archived'])
        .optional()
        .describe('Filter by form status'),
      search: z.string().optional().describe('Search by form title'),
      limit: z.number().default(20).describe('Max results to return'),
      offset: z.number().default(0).describe('Pagination offset'),
    },
    async (args, extra) => {
      try {
        const { userId, token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);
        const { PersonalFormService } = await import(
          '@/lib/services/personal-form-service'
        );

        const page = Math.floor(args.offset / args.limit) + 1;
        const result = await PersonalFormService.getPersonalForms(
          {
            status: args.status,
            search: args.search,
            limit: args.limit,
            page,
          },
          userId,
          supabase
        );

        return toolSuccess({
          forms:
            result.data?.map((f: any) => ({
              id: f.id,
              title: f.title,
              status: f.status,
              response_count: f.response_count || 0,
              created_at: f.created_at,
              is_public: f.is_public,
            })) || [],
          total: result.total || 0,
          limit: args.limit,
          offset: args.offset,
        });
      } catch (error) {
        return toolError('Failed to list forms', error);
      }
    }
  );

  server.tool(
    'get_personal_form',
    'Get full details of a specific personal form including all fields, settings, and collaborators.',
    {
      form_id: z.string().uuid().describe('Form ID (UUID)'),
    },
    async (args, extra) => {
      try {
        const { userId, token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);
        const { PersonalFormService } = await import(
          '@/lib/services/personal-form-service'
        );

        const form = await PersonalFormService.getPersonalForm(
          args.form_id,
          userId,
          supabase
        );
        if (!form) return toolError('Form not found');

        return toolSuccess(form);
      } catch (error) {
        return toolError('Failed to get form', error);
      }
    }
  );

  server.tool(
    'update_personal_form',
    'Update a personal form — change title, description, fields, status, or settings. Only include the fields you want to change.',
    {
      form_id: z.string().uuid().describe('Form ID to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      fields: z
        .array(formFieldSchema)
        .optional()
        .describe('Updated field definitions (replaces all existing fields)'),
      status: z
        .enum(['draft', 'published', 'archived'])
        .optional()
        .describe('New status'),
      is_public: z.boolean().optional().describe('Public access toggle'),
      submission_limit: z
        .number()
        .nullable()
        .optional()
        .describe('Max submissions (null for unlimited)'),
    },
    async (args, extra) => {
      try {
        const { userId, token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);
        const { PersonalFormService } = await import(
          '@/lib/services/personal-form-service'
        );

        const updates: Record<string, unknown> = {};
        if (args.title !== undefined) updates.title = args.title;
        if (args.description !== undefined)
          updates.description = args.description;
        if (args.status !== undefined) updates.status = args.status;
        if (args.is_public !== undefined) updates.is_public = args.is_public;
        if (args.submission_limit !== undefined)
          updates.submission_limit = args.submission_limit;
        if (args.fields !== undefined) {
          updates.fields = args.fields.map((f, i) => ({
            id: f.id || `field_${Date.now()}_${i}`,
            ...f,
          }));
        }

        const form = await PersonalFormService.updatePersonalForm(
          args.form_id,
          updates,
          userId,
          supabase
        );

        return toolSuccess({
          ...form,
          message: `Form "${form.title}" updated successfully`,
        });
      } catch (error) {
        return toolError('Failed to update form', error);
      }
    }
  );

  server.tool(
    'delete_personal_form',
    'Permanently delete a personal form and all its responses. This action cannot be undone.',
    {
      form_id: z.string().uuid().describe('Form ID to delete'),
    },
    async (args, extra) => {
      try {
        const { userId, token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);
        const { PersonalFormService } = await import(
          '@/lib/services/personal-form-service'
        );

        const form = await PersonalFormService.getPersonalForm(
          args.form_id,
          userId,
          supabase
        );
        if (!form) return toolError('Form not found');

        await PersonalFormService.deletePersonalForm(args.form_id, supabase);
        return toolSuccess({
          message: `Form "${form.title}" deleted successfully`,
        });
      } catch (error) {
        return toolError('Failed to delete form', error);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  //  PERSONAL FORMS — RESPONSES & ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  server.tool(
    'get_personal_form_responses',
    'Get all responses submitted to a personal form. Returns submission data, user email, and timestamps with pagination.',
    {
      form_id: z.string().uuid().describe('Form ID'),
      limit: z.number().default(50).describe('Max results'),
      offset: z.number().default(0).describe('Pagination offset'),
      search: z.string().optional().describe('Search in responses'),
    },
    async (args, extra) => {
      try {
        const { userId, token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);
        const { PersonalFormService } = await import(
          '@/lib/services/personal-form-service'
        );

        const page = Math.floor(args.offset / args.limit) + 1;
        const result = await PersonalFormService.getResponses(
          args.form_id,
          userId,
          page,
          args.limit,
          supabase,
          args.search
        );

        return toolSuccess({
          responses: result.data || [],
          total: result.total || 0,
          page,
          limit: args.limit,
        });
      } catch (error) {
        return toolError('Failed to get responses', error);
      }
    }
  );

  server.tool(
    'get_personal_form_stats',
    'Get submission statistics for a personal form — total count, submission limit status, and whether the form can still accept submissions.',
    {
      form_id: z.string().uuid().describe('Form ID'),
    },
    async (args, extra) => {
      try {
        extractAuth(extra); // Verify authenticated
        const { PersonalFormService } = await import(
          '@/lib/services/personal-form-service'
        );
        const stats = await PersonalFormService.getResponseStatistics(
          args.form_id
        );
        return toolSuccess(stats);
      } catch (error) {
        return toolError('Failed to get form stats', error);
      }
    }
  );

  server.tool(
    'get_personal_form_analytics',
    'Get detailed analytics for a personal form — field-level breakdowns, value distributions, response trends over time, and day/hour heatmaps.',
    {
      form_id: z.string().uuid().describe('Form ID'),
    },
    async (args, extra) => {
      try {
        const { token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);
        const { PersonalFormAnalyticsService } = await import(
          '@/lib/services/personal-form-analytics-service'
        );

        const [overview, fieldStats] = await Promise.all([
          PersonalFormAnalyticsService.getAnalyticsSummary(
            args.form_id,
            undefined,
            supabase
          ),
          PersonalFormAnalyticsService.getFieldStatistics(
            args.form_id,
            undefined,
            supabase
          ),
        ]);

        return toolSuccess({ overview, field_analytics: fieldStats });
      } catch (error) {
        return toolError('Failed to get analytics', error);
      }
    }
  );

  server.tool(
    'get_personal_form_insights',
    'Get AI-powered insights analyzing form response patterns. Uses Claude to generate 4-6 actionable insights about growth trends, peak submission times, low-completion fields, and recommendations.',
    {
      form_id: z.string().uuid().describe('Form ID'),
    },
    async (args, extra) => {
      try {
        const { userId, token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);

        const { PersonalFormService } = await import(
          '@/lib/services/personal-form-service'
        );
        const { PersonalFormAnalyticsService } = await import(
          '@/lib/services/personal-form-analytics-service'
        );
        const { AIInsightsService } = await import(
          '@/lib/services/ai-insights-service'
        );

        // Get form details (needed for AnalyticsContext)
        const form = await PersonalFormService.getPersonalForm(
          args.form_id,
          userId,
          supabase
        );
        if (!form) return toolError('Form not found');

        const [overview, fieldStatistics] = await Promise.all([
          PersonalFormAnalyticsService.getAnalyticsSummary(
            args.form_id,
            undefined,
            supabase
          ),
          PersonalFormAnalyticsService.getFieldStatistics(
            args.form_id,
            undefined,
            supabase
          ),
        ]);

        // Build AnalyticsContext matching the interface exactly
        const analyticsContext = {
          formTitle: form.title,
          formDescription: form.description || undefined,
          totalResponses: overview.totalResponses,
          uniqueSubmitters: overview.uniqueSubmitters,
          completionRate: overview.completionRate,
          responseVelocity: overview.responseVelocity,
          peakSubmissionDay: overview.peakSubmissionDay,
          submissionStatus: {
            atLimit: form.submission_limit
              ? overview.totalResponses >= form.submission_limit
              : false,
            remaining: form.submission_limit
              ? form.submission_limit - overview.totalResponses
              : null,
          },
          responsesByDayOfWeek: overview.responsesByDayOfWeek,
          responsesByHourOfDay: overview.responsesByHourOfDay,
          responsesByPeriod: overview.responsesByPeriod,
          fieldStatistics,
        };

        const insights =
          await AIInsightsService.generateInsights(analyticsContext);

        return toolSuccess({ insights });
      } catch (error) {
        return toolError('Failed to generate insights', error);
      }
    }
  );

  server.tool(
    'export_personal_form_responses',
    'Export all responses for a personal form as CSV text data. Useful for downloading or further analyzing response data in spreadsheets.',
    {
      form_id: z.string().uuid().describe('Form ID'),
    },
    async (args, extra) => {
      try {
        const { userId } = extractAuth(extra);
        const { PersonalFormService } = await import(
          '@/lib/services/personal-form-service'
        );

        const csv = await PersonalFormService.exportToCSV(
          args.form_id,
          userId
        );
        return toolSuccess({ format: 'csv', data: csv });
      } catch (error) {
        return toolError('Failed to export responses', error);
      }
    }
  );

  server.tool(
    'duplicate_personal_form',
    'Create a copy of an existing personal form with all its fields and settings. The copy starts with zero responses and a new slug.',
    {
      form_id: z
        .string()
        .uuid()
        .describe('Source form ID to duplicate'),
      new_title: z
        .string()
        .optional()
        .describe('Title for the copy (defaults to "Copy of {original}")'),
    },
    async (args, extra) => {
      try {
        const { userId, token } = extractAuth(extra);
        const { PersonalFormService } = await import(
          '@/lib/services/personal-form-service'
        );

        const newForm = await PersonalFormService.duplicateForm(
          args.form_id,
          'personal',
          userId
        );

        if (args.new_title) {
          const supabase = createMcpSupabaseClient(token);
          await PersonalFormService.updatePersonalForm(
            newForm.id,
            { title: args.new_title },
            userId,
            supabase
          );
          newForm.title = args.new_title;
        }

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          'https://ai-forms.jicate.solutions';
        return toolSuccess({
          id: newForm.id,
          title: newForm.title,
          public_url: `${appUrl}/forms/public/${newForm.id}`,
          message: 'Form duplicated successfully',
        });
      } catch (error) {
        return toolError('Failed to duplicate form', error);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  //  PERSONAL FORMS — COLLABORATORS
  // ═══════════════════════════════════════════════════════════════

  server.tool(
    'manage_personal_form_collaborators',
    'Add, update permissions, or remove collaborators on a personal form. Collaborators can be given granular permissions: edit structure, view responses, export data, manage other collaborators. Use search_users to find user IDs.',
    {
      form_id: z.string().uuid().describe('Form ID'),
      action: z
        .enum(['add', 'update', 'remove'])
        .describe('Action to perform'),
      user_id: z
        .string()
        .uuid()
        .describe('Collaborator user ID (use search_users tool to find)'),
      permissions: z
        .object({
          can_edit_structure: z.boolean().default(false),
          can_view_responses: z.boolean().default(true),
          can_export_data: z.boolean().default(false),
          can_manage_collaborators: z.boolean().default(false),
        })
        .optional()
        .describe('Permissions object (required for add/update actions)'),
    },
    async (args, extra) => {
      try {
        const { userId, token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);
        const { PersonalFormService } = await import(
          '@/lib/services/personal-form-service'
        );

        if (args.action === 'add') {
          if (!args.permissions)
            return toolError('Permissions required for add action');
          const collaborator = await PersonalFormService.addCollaborator(
            {
              personal_form_id: args.form_id,
              user_id: args.user_id,
              is_owner: false,
              added_by: userId,
              ...args.permissions,
            },
            userId,
            supabase
          );
          return toolSuccess({
            collaborator,
            message: 'Collaborator added',
          });
        }

        if (args.action === 'update') {
          if (!args.permissions)
            return toolError('Permissions required for update action');
          const existing =
            await PersonalFormService.getUserCollaboratorRecord(
              args.form_id,
              args.user_id,
              supabase
            );
          if (!existing) return toolError('Collaborator not found');
          const updated =
            await PersonalFormService.updateCollaboratorPermissions(
              existing.id,
              args.permissions
            );
          return toolSuccess({
            collaborator: updated,
            message: 'Permissions updated',
          });
        }

        if (args.action === 'remove') {
          const existing =
            await PersonalFormService.getUserCollaboratorRecord(
              args.form_id,
              args.user_id,
              supabase
            );
          if (!existing) return toolError('Collaborator not found');
          await PersonalFormService.removeCollaborator(
            existing.id,
            supabase
          );
          return toolSuccess({ message: 'Collaborator removed' });
        }

        return toolError('Invalid action');
      } catch (error) {
        return toolError('Failed to manage collaborators', error);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  //  INSTITUTIONAL FORMS
  // ═══════════════════════════════════════════════════════════════

  server.tool(
    'list_institutional_forms',
    'List institutional forms with role-based filtering. Super admins see all forms; coordinators see their institution forms only.',
    {
      institution_id: z
        .string()
        .uuid()
        .optional()
        .describe('Filter by institution'),
      event_id: z
        .string()
        .uuid()
        .optional()
        .describe('Filter by event'),
      status: z
        .enum(['draft', 'published', 'archived'])
        .optional()
        .describe('Filter by status'),
    },
    async (args, extra) => {
      try {
        const { token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);

        let query = supabase.from('forms').select('*');
        if (args.institution_id)
          query = query.eq('institution_id', args.institution_id);
        if (args.event_id) query = query.eq('event_id', args.event_id);
        if (args.status) query = query.eq('status', args.status);

        const { data, error } = await query.order('created_at', {
          ascending: false,
        });
        if (error) return toolError('Query failed', error);

        return toolSuccess({
          forms: data || [],
          total: data?.length || 0,
        });
      } catch (error) {
        return toolError('Failed to list institutional forms', error);
      }
    }
  );

  server.tool(
    'create_institutional_form',
    'Create a new institutional form linked to an institution and optionally an event. Requires event_coordinator role or higher.',
    {
      title: z.string().min(1).describe('Form title'),
      institution_id: z.string().uuid().describe('Institution ID'),
      event_id: z
        .string()
        .uuid()
        .optional()
        .describe('Link form to an event'),
      fields: z
        .array(formFieldSchema)
        .min(1)
        .describe('Form fields'),
      is_public: z.boolean().default(true),
      status: z
        .enum(['draft', 'published'])
        .default('published'),
    },
    async (args, extra) => {
      try {
        const { userId, role, token } = extractAuth(extra);
        if (!hasMinimumRole(role, 'event_coordinator')) {
          return toolError(
            'Requires event_coordinator role or higher'
          );
        }

        const supabase = createMcpSupabaseClient(token);
        const fields = args.fields.map((f, i) => ({
          id: f.id || `field_${Date.now()}_${i}`,
          ...f,
        }));

        const { data, error } = await supabase
          .from('forms')
          .insert({
            title: args.title,
            institution_id: args.institution_id,
            event_id: args.event_id || null,
            fields,
            is_public: args.is_public,
            status: args.status,
            created_by: userId,
          })
          .select()
          .single();

        if (error) return toolError('Failed to create form', error);
        return toolSuccess({
          ...data,
          message: `Institutional form "${args.title}" created`,
        });
      } catch (error) {
        return toolError('Failed to create institutional form', error);
      }
    }
  );

  server.tool(
    'get_institutional_form_responses',
    'Get responses for an institutional form. Access is controlled via Supabase RLS based on the user role.',
    {
      form_id: z.string().uuid().describe('Form ID'),
      limit: z.number().default(50),
      offset: z.number().default(0),
    },
    async (args, extra) => {
      try {
        const { token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);

        const { data, error, count } = await supabase
          .from('form_responses')
          .select('*', { count: 'exact' })
          .eq('form_id', args.form_id)
          .order('created_at', { ascending: false })
          .range(args.offset, args.offset + args.limit - 1);

        if (error) return toolError('Query failed', error);
        return toolSuccess({
          responses: data || [],
          total: count || 0,
        });
      } catch (error) {
        return toolError('Failed to get responses', error);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  //  EVENTS
  // ═══════════════════════════════════════════════════════════════

  server.tool(
    'list_events',
    'List events with optional filtering by institution, search term, or limit. Includes venue information.',
    {
      institution_id: z
        .string()
        .uuid()
        .optional()
        .describe('Filter by institution'),
      search: z
        .string()
        .optional()
        .describe('Search by event title'),
      limit: z.number().default(20),
    },
    async (args, extra) => {
      try {
        const { token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);

        let query = supabase
          .from('events')
          .select('*, places(name, location)');
        if (args.institution_id)
          query = query.eq('institution_id', args.institution_id);
        if (args.search)
          query = query.ilike('title', `%${args.search}%`);

        const { data, error } = await query
          .order('start_time', { ascending: false })
          .limit(args.limit);

        if (error) return toolError('Query failed', error);
        return toolSuccess({ events: data || [] });
      } catch (error) {
        return toolError('Failed to list events', error);
      }
    }
  );

  server.tool(
    'create_event',
    'Create a new event linked to an institution. Requires event_coordinator role or higher. Times should be in ISO 8601 format.',
    {
      title: z.string().min(1).describe('Event title'),
      institution_id: z.string().uuid().describe('Institution ID'),
      start_time: z
        .string()
        .describe('Start time in ISO 8601 format (e.g. 2026-04-15T09:00:00)'),
      end_time: z
        .string()
        .describe('End time in ISO 8601 format (e.g. 2026-04-15T17:00:00)'),
      department_id: z
        .string()
        .uuid()
        .optional()
        .describe('Department ID'),
      place_id: z
        .string()
        .uuid()
        .optional()
        .describe('Venue/place ID'),
      has_registration_form: z
        .boolean()
        .default(false)
        .describe('Whether event needs a registration form'),
    },
    async (args, extra) => {
      try {
        const { userId, role, token } = extractAuth(extra);
        if (!hasMinimumRole(role, 'event_coordinator')) {
          return toolError(
            'Requires event_coordinator role or higher'
          );
        }

        const supabase = createMcpSupabaseClient(token);
        const { data, error } = await supabase
          .from('events')
          .insert({
            title: args.title,
            institution_id: args.institution_id,
            start_time: args.start_time,
            end_time: args.end_time,
            department_id: args.department_id || null,
            place_id: args.place_id || null,
            has_registration_form: args.has_registration_form,
            coordinator_id: userId,
          })
          .select()
          .single();

        if (error) return toolError('Failed to create event', error);
        return toolSuccess({
          ...data,
          message: `Event "${args.title}" created`,
        });
      } catch (error) {
        return toolError('Failed to create event', error);
      }
    }
  );

  server.tool(
    'get_event',
    'Get full details of a specific event including venue, coordinators, and linked registration forms.',
    {
      event_id: z.string().uuid().describe('Event ID'),
    },
    async (args, extra) => {
      try {
        const { token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);

        const { data, error } = await supabase
          .from('events')
          .select(
            '*, places(name, location, capacity), forms(id, title, status), event_coordinators(user_id, role)'
          )
          .eq('id', args.event_id)
          .single();

        if (error) return toolError('Event not found', error);
        return toolSuccess(data);
      } catch (error) {
        return toolError('Failed to get event', error);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════════════

  server.tool(
    'list_form_templates',
    'List available form templates that can be used as starting points for new forms. Templates include pre-configured fields and can save time.',
    {
      category: z
        .string()
        .optional()
        .describe('Filter by template category'),
    },
    async (args, extra) => {
      try {
        const { token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);

        let query = supabase.from('form_templates').select('*');
        if (args.category)
          query = query.eq('category', args.category);

        const { data, error } = await query.order('title');
        if (error) return toolError('Query failed', error);

        return toolSuccess({
          templates:
            data?.map((t: any) => ({
              id: t.id,
              title: t.title,
              category: t.category,
              field_count: t.fields?.length || 0,
              fields_preview: t.fields
                ?.slice(0, 5)
                .map((f: any) => `${f.label} (${f.type})`),
            })) || [],
        });
      } catch (error) {
        return toolError('Failed to list templates', error);
      }
    }
  );

  server.tool(
    'search_users',
    'Search for users by name or email. Useful for finding collaborators to add to forms. Returns user ID, name, email, and role.',
    {
      query: z
        .string()
        .min(1)
        .describe('Search term (name or email)'),
      limit: z.number().default(10).describe('Max results'),
    },
    async (args, extra) => {
      try {
        const { token } = extractAuth(extra);
        const supabase = createMcpSupabaseClient(token);

        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, avatar_url')
          .or(
            `full_name.ilike.%${args.query}%,email.ilike.%${args.query}%`
          )
          .eq('is_active', true)
          .limit(args.limit);

        if (error) return toolError('Search failed', error);
        return toolSuccess({ users: data || [] });
      } catch (error) {
        return toolError('Failed to search users', error);
      }
    }
  );
}
