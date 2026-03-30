-- ============================================
-- PERSONAL FORMS FEATURE MIGRATION
-- ============================================
-- This migration adds support for personal forms with collaboration
-- and permission-based sharing, independent from institutional hierarchy.
--
-- Created: 2025-01-18
-- Tables: personal_forms, personal_form_collaborators, personal_form_responses
-- ============================================

-- ============================================
-- TABLE: personal_forms
-- ============================================
-- Personal forms that are completely independent from institutions
-- Users can create forms for their own use and share with collaborators

CREATE TABLE IF NOT EXISTS personal_forms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Form metadata
    title TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    slug TEXT UNIQUE,  -- SEO-friendly URL (e.g., "my-survey-2024")

    -- Form content (same JSONB structure as institutional forms)
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Status and visibility
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_public BOOLEAN DEFAULT false,

    -- Submission control
    submission_limit INTEGER,  -- NULL = unlimited submissions

    -- Ownership (no institution_id - completely independent)
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

    -- Constraints
    CONSTRAINT personal_forms_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT personal_forms_submission_limit_positive CHECK (submission_limit IS NULL OR submission_limit > 0)
);

-- Add index on created_by for efficient user queries
CREATE INDEX IF NOT EXISTS idx_personal_forms_created_by ON personal_forms(created_by);

-- Add index on slug for public URL lookups
CREATE INDEX IF NOT EXISTS idx_personal_forms_slug ON personal_forms(slug) WHERE slug IS NOT NULL;

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_personal_forms_status ON personal_forms(status);

-- Add index on is_public for public form queries
CREATE INDEX IF NOT EXISTS idx_personal_forms_is_public ON personal_forms(is_public) WHERE is_public = true;

-- Add composite index for user forms list queries
CREATE INDEX IF NOT EXISTS idx_personal_forms_user_status ON personal_forms(created_by, status);

-- Add comment for documentation
COMMENT ON TABLE personal_forms IS 'Personal forms created by users, independent from institutional hierarchy. Supports collaboration and permission-based sharing.';
COMMENT ON COLUMN personal_forms.fields IS 'JSONB array containing form field definitions with conditional logic (same structure as institutional forms)';
COMMENT ON COLUMN personal_forms.slug IS 'SEO-friendly URL slug generated from title. Used for public form access.';
COMMENT ON COLUMN personal_forms.submission_limit IS 'Optional limit on number of submissions. NULL means unlimited.';


-- ============================================
-- TABLE: personal_form_collaborators
-- ============================================
-- Junction table for managing collaborators and their permissions
-- Supports granular permission control and multiple owners

CREATE TABLE IF NOT EXISTS personal_form_collaborators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Relations
    personal_form_id UUID NOT NULL REFERENCES personal_forms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Granular permissions (4 capabilities)
    can_edit_structure BOOLEAN DEFAULT false NOT NULL,      -- Modify fields, conditional logic, settings
    can_view_responses BOOLEAN DEFAULT false NOT NULL,      -- View submissions and statistics
    can_export_data BOOLEAN DEFAULT false NOT NULL,         -- Download CSV/Excel exports
    can_manage_collaborators BOOLEAN DEFAULT false NOT NULL, -- Add/remove collaborators, modify permissions

    -- Ownership flag (multiple owners possible)
    is_owner BOOLEAN DEFAULT false NOT NULL,

    -- Metadata
    added_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- Who added this collaborator

    -- Constraints
    UNIQUE(personal_form_id, user_id)  -- Prevent duplicate collaborator entries
);

-- Add index on personal_form_id for efficient collaborator lookups
CREATE INDEX IF NOT EXISTS idx_personal_form_collaborators_form ON personal_form_collaborators(personal_form_id);

-- Add index on user_id for "my collaborations" queries
CREATE INDEX IF NOT EXISTS idx_personal_form_collaborators_user ON personal_form_collaborators(user_id);

-- Add composite index for permission checks
CREATE INDEX IF NOT EXISTS idx_personal_form_collaborators_form_user ON personal_form_collaborators(personal_form_id, user_id);

-- Add index for owner queries
CREATE INDEX IF NOT EXISTS idx_personal_form_collaborators_owner ON personal_form_collaborators(personal_form_id, is_owner) WHERE is_owner = true;

-- Add comment for documentation
COMMENT ON TABLE personal_form_collaborators IS 'Manages collaborators and their granular permissions for personal forms. Supports multiple owners.';
COMMENT ON COLUMN personal_form_collaborators.can_edit_structure IS 'Permission to modify form fields, conditional logic, and settings';
COMMENT ON COLUMN personal_form_collaborators.can_view_responses IS 'Permission to view form submissions and statistics';
COMMENT ON COLUMN personal_form_collaborators.can_export_data IS 'Permission to export responses as CSV/Excel';
COMMENT ON COLUMN personal_form_collaborators.can_manage_collaborators IS 'Permission to add/remove collaborators and modify their permissions';
COMMENT ON COLUMN personal_form_collaborators.is_owner IS 'Owner flag. Multiple users can be owners. Form creator is always an owner.';


-- ============================================
-- TABLE: personal_form_responses
-- ============================================
-- Stores form submissions for personal forms
-- No payment support (personal forms don't handle payments)

CREATE TABLE IF NOT EXISTS personal_form_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Form relation
    personal_form_id UUID NOT NULL REFERENCES personal_forms(id) ON DELETE CASCADE,

    -- Unique submission identifier (format: SUB-PREFIX-NNNNNN)
    submission_id TEXT UNIQUE NOT NULL,

    -- Response data (JSONB object with field_id as keys)
    response_data JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Submitter information
    submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL if anonymous
    user_email TEXT,
    is_anonymous BOOLEAN DEFAULT false NOT NULL,

    -- Note: No payment fields (payment_status, payment_amount, etc.)
    -- Personal forms do not support payment collection

    -- Timestamp
    submitted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

    -- Constraints
    CONSTRAINT personal_form_responses_submission_id_format CHECK (submission_id ~ '^SUB-[A-Z0-9]+-[0-9]{6}$'),
    CONSTRAINT personal_form_responses_data_not_empty CHECK (jsonb_typeof(response_data) = 'object')
);

-- Add index on personal_form_id for efficient response queries
CREATE INDEX IF NOT EXISTS idx_personal_form_responses_form ON personal_form_responses(personal_form_id);

-- Add index on submission_id for unique lookups
CREATE INDEX IF NOT EXISTS idx_personal_form_responses_submission_id ON personal_form_responses(submission_id);

-- Add index on submitted_by for user's submission history
CREATE INDEX IF NOT EXISTS idx_personal_form_responses_user ON personal_form_responses(submitted_by) WHERE submitted_by IS NOT NULL;

-- Add index on submitted_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_personal_form_responses_submitted_at ON personal_form_responses(submitted_at DESC);

-- Add composite index for form responses with date filtering
CREATE INDEX IF NOT EXISTS idx_personal_form_responses_form_date ON personal_form_responses(personal_form_id, submitted_at DESC);

-- Add comment for documentation
COMMENT ON TABLE personal_form_responses IS 'Form submissions for personal forms. Does not support payment processing.';
COMMENT ON COLUMN personal_form_responses.submission_id IS 'Unique submission identifier in format SUB-PREFIX-NNNNNN where PREFIX is first 3 letters of form title';
COMMENT ON COLUMN personal_form_responses.response_data IS 'JSONB object containing form field responses with field_id as keys';


-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to automatically update updated_at timestamp on personal_forms
CREATE TRIGGER set_personal_forms_updated_at
    BEFORE UPDATE ON personal_forms
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();


-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all three tables
ALTER TABLE personal_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_form_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_form_responses ENABLE ROW LEVEL SECURITY;


-- ============================================
-- RLS POLICIES: personal_forms
-- ============================================

-- SELECT: View forms if you're creator, collaborator, or it's public
CREATE POLICY "personal_forms_select" ON personal_forms
FOR SELECT USING (
    -- Public forms are visible to everyone
    is_public = true
    -- Creator can always view their forms
    OR created_by = auth.uid()
    -- Collaborators can view forms they have access to
    OR EXISTS (
        SELECT 1 FROM personal_form_collaborators pfc
        WHERE pfc.personal_form_id = id
        AND pfc.user_id = auth.uid()
    )
);

-- INSERT: Any authenticated user can create personal forms
CREATE POLICY "personal_forms_insert" ON personal_forms
FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = created_by
);

-- UPDATE: Creator or collaborators with can_edit_structure permission
CREATE POLICY "personal_forms_update" ON personal_forms
FOR UPDATE USING (
    -- Creator can always update their forms
    created_by = auth.uid()
    -- Collaborators with edit permission can update
    OR EXISTS (
        SELECT 1 FROM personal_form_collaborators pfc
        WHERE pfc.personal_form_id = id
        AND pfc.user_id = auth.uid()
        AND pfc.can_edit_structure = true
    )
);

-- DELETE: Only the creator can delete forms
CREATE POLICY "personal_forms_delete" ON personal_forms
FOR DELETE USING (
    created_by = auth.uid()
);


-- ============================================
-- RLS POLICIES: personal_form_collaborators
-- ============================================

-- SELECT: View collaborators if you're the creator, a collaborator, or have manage permission
CREATE POLICY "personal_form_collaborators_select" ON personal_form_collaborators
FOR SELECT USING (
    -- You can see yourself as a collaborator
    user_id = auth.uid()
    -- Creator can see all collaborators
    OR EXISTS (
        SELECT 1 FROM personal_forms pf
        WHERE pf.id = personal_form_id
        AND pf.created_by = auth.uid()
    )
    -- Users with manage_collaborators permission can see all collaborators
    OR EXISTS (
        SELECT 1 FROM personal_form_collaborators pfc2
        WHERE pfc2.personal_form_id = personal_form_id
        AND pfc2.user_id = auth.uid()
        AND pfc2.can_manage_collaborators = true
    )
);

-- INSERT: Creator or users with can_manage_collaborators permission can add collaborators
CREATE POLICY "personal_form_collaborators_insert" ON personal_form_collaborators
FOR INSERT WITH CHECK (
    -- Creator can add collaborators
    EXISTS (
        SELECT 1 FROM personal_forms pf
        WHERE pf.id = personal_form_id
        AND pf.created_by = auth.uid()
    )
    -- Users with manage permission can add collaborators
    OR EXISTS (
        SELECT 1 FROM personal_form_collaborators pfc
        WHERE pfc.personal_form_id = personal_form_id
        AND pfc.user_id = auth.uid()
        AND pfc.can_manage_collaborators = true
    )
);

-- UPDATE: Creator or users with can_manage_collaborators permission can update permissions
CREATE POLICY "personal_form_collaborators_update" ON personal_form_collaborators
FOR UPDATE USING (
    -- Creator can update any collaborator permissions
    EXISTS (
        SELECT 1 FROM personal_forms pf
        WHERE pf.id = personal_form_id
        AND pf.created_by = auth.uid()
    )
    -- Users with manage permission can update permissions
    OR EXISTS (
        SELECT 1 FROM personal_form_collaborators pfc
        WHERE pfc.personal_form_id = personal_form_id
        AND pfc.user_id = auth.uid()
        AND pfc.can_manage_collaborators = true
    )
);

-- DELETE: Creator or managers can remove collaborators (but cannot remove the creator)
CREATE POLICY "personal_form_collaborators_delete" ON personal_form_collaborators
FOR DELETE USING (
    -- Creator can remove collaborators (except themselves)
    (
        EXISTS (
            SELECT 1 FROM personal_forms pf
            WHERE pf.id = personal_form_id
            AND pf.created_by = auth.uid()
        )
        AND user_id != (
            SELECT created_by FROM personal_forms WHERE id = personal_form_id
        )
    )
    -- Users with manage permission can remove collaborators (except the creator)
    OR (
        EXISTS (
            SELECT 1 FROM personal_form_collaborators pfc
            WHERE pfc.personal_form_id = personal_form_id
            AND pfc.user_id = auth.uid()
            AND pfc.can_manage_collaborators = true
        )
        AND user_id != (
            SELECT created_by FROM personal_forms WHERE id = personal_form_id
        )
    )
);


-- ============================================
-- RLS POLICIES: personal_form_responses
-- ============================================

-- SELECT: View responses if you submitted it, you're the creator, or you have can_view_responses permission
CREATE POLICY "personal_form_responses_select" ON personal_form_responses
FOR SELECT USING (
    -- Users can view their own submissions
    submitted_by = auth.uid()
    -- Form creator can view all responses
    OR EXISTS (
        SELECT 1 FROM personal_forms pf
        WHERE pf.id = personal_form_id
        AND pf.created_by = auth.uid()
    )
    -- Collaborators with view_responses permission can view
    OR EXISTS (
        SELECT 1 FROM personal_form_collaborators pfc
        WHERE pfc.personal_form_id = personal_form_id
        AND pfc.user_id = auth.uid()
        AND pfc.can_view_responses = true
    )
);

-- INSERT (Public): Allow submissions to published public forms
CREATE POLICY "personal_form_responses_insert_public" ON personal_form_responses
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM personal_forms pf
        WHERE pf.id = personal_form_id
        AND pf.is_public = true
        AND pf.status = 'published'
    )
);

-- INSERT (Authenticated): Authenticated users can submit to any published form they can access
CREATE POLICY "personal_form_responses_insert_authenticated" ON personal_form_responses
FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM personal_forms pf
        WHERE pf.id = personal_form_id
        AND pf.status = 'published'
        AND (
            pf.is_public = true
            OR pf.created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM personal_form_collaborators pfc
                WHERE pfc.personal_form_id = pf.id
                AND pfc.user_id = auth.uid()
            )
        )
    )
);

-- UPDATE: Responses are immutable after submission (no update allowed)
-- No UPDATE policy defined - responses cannot be edited

-- DELETE: Responses cannot be deleted by users (preserve data integrity)
-- Only form creator can delete responses if needed (handled in application layer with admin client)
CREATE POLICY "personal_form_responses_delete" ON personal_form_responses
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM personal_forms pf
        WHERE pf.id = personal_form_id
        AND pf.created_by = auth.uid()
    )
);


-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if a user can accept more submissions (respects submission_limit)
CREATE OR REPLACE FUNCTION can_accept_personal_form_submission(form_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    form_limit INTEGER;
    current_count INTEGER;
BEGIN
    -- Get the submission limit for the form
    SELECT submission_limit INTO form_limit
    FROM personal_forms
    WHERE id = form_id;

    -- If no limit is set, always accept submissions
    IF form_limit IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Count current submissions
    SELECT COUNT(*) INTO current_count
    FROM personal_form_responses
    WHERE personal_form_id = form_id;

    -- Check if we're under the limit
    RETURN current_count < form_limit;
END;
$$;

COMMENT ON FUNCTION can_accept_personal_form_submission IS 'Checks if a personal form can accept more submissions based on its submission_limit. Returns true if limit not reached or no limit set.';


-- Function to get personal form statistics
CREATE OR REPLACE FUNCTION get_personal_form_stats(form_id UUID)
RETURNS TABLE(
    total_responses BIGINT,
    unique_submitters BIGINT,
    last_submission_at TIMESTAMPTZ,
    is_at_limit BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) AS total_responses,
        COUNT(DISTINCT submitted_by) FILTER (WHERE submitted_by IS NOT NULL) AS unique_submitters,
        MAX(submitted_at) AS last_submission_at,
        NOT can_accept_personal_form_submission(form_id) AS is_at_limit
    FROM personal_form_responses
    WHERE personal_form_id = form_id;
END;
$$;

COMMENT ON FUNCTION get_personal_form_stats IS 'Returns statistics for a personal form including total responses, unique submitters, last submission time, and whether submission limit is reached.';


-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on tables to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON personal_forms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON personal_form_collaborators TO authenticated;
GRANT SELECT, INSERT, DELETE ON personal_form_responses TO authenticated;

-- Grant usage on helper functions
GRANT EXECUTE ON FUNCTION can_accept_personal_form_submission TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_personal_form_stats TO authenticated;


-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personal_forms') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personal_form_collaborators') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personal_form_responses') THEN
        RAISE NOTICE 'Personal Forms migration completed successfully!';
        RAISE NOTICE 'Created tables: personal_forms, personal_form_collaborators, personal_form_responses';
        RAISE NOTICE 'Created helper functions: can_accept_personal_form_submission, get_personal_form_stats';
    ELSE
        RAISE EXCEPTION 'Personal Forms migration failed - some tables were not created';
    END IF;
END $$;
