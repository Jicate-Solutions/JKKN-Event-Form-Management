-- Migration: Add User Profile Autofetch Feature for Personal Forms
-- Description: Adds user_profile_cache table and enables MYJKKN API integration

-- Create user_profile_cache table for storing fetched user data
CREATE TABLE IF NOT EXISTS user_profile_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'staff')),

  -- Unified profile data
  full_name TEXT NOT NULL,
  mobile TEXT,
  institution_name TEXT,
  department_name TEXT,
  identifier TEXT, -- roll_number for students, staff_id for staff
  additional_info TEXT, -- program_name for students, category for staff

  -- Raw data from MYJKKN API (for debugging and future use)
  raw_data JSONB,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profile_cache_email
  ON user_profile_cache(email);

CREATE INDEX IF NOT EXISTS idx_user_profile_cache_user_type
  ON user_profile_cache(user_type);

CREATE INDEX IF NOT EXISTS idx_user_profile_cache_institution
  ON user_profile_cache(institution_name);

CREATE INDEX IF NOT EXISTS idx_user_profile_cache_department
  ON user_profile_cache(department_name);

CREATE INDEX IF NOT EXISTS idx_user_profile_cache_fetched_at
  ON user_profile_cache(fetched_at);

-- Add enable_user_autofetch to personal_forms
ALTER TABLE personal_forms
ADD COLUMN IF NOT EXISTS enable_user_autofetch BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS myjkkn_api_key TEXT;

-- Add user_profile to personal_form_responses
ALTER TABLE personal_form_responses
ADD COLUMN IF NOT EXISTS user_profile JSONB;

-- Create index for querying responses with profiles
CREATE INDEX IF NOT EXISTS idx_personal_form_responses_user_profile
  ON personal_form_responses USING GIN (user_profile);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profile_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_user_profile_cache_updated_at ON user_profile_cache;
CREATE TRIGGER trigger_update_user_profile_cache_updated_at
  BEFORE UPDATE ON user_profile_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profile_cache_updated_at();

-- Enable RLS on user_profile_cache
ALTER TABLE user_profile_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profile_cache

-- Super admins and administrators can view all profiles
CREATE POLICY "super_admin_admin_view_all_profiles" ON user_profile_cache
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );

-- Users can view their own profile
CREATE POLICY "users_view_own_profile" ON user_profile_cache
  FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Only super_admin can insert/update profiles (via service role in practice)
CREATE POLICY "super_admin_manage_profiles" ON user_profile_cache
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Service role can do everything (for API operations)
CREATE POLICY "service_role_all_profiles" ON user_profile_cache
  FOR ALL
  TO service_role
  USING (true);

-- Comments for documentation
COMMENT ON TABLE user_profile_cache IS 'Caches user profile data fetched from MYJKKN application to avoid redundant API calls';
COMMENT ON COLUMN user_profile_cache.email IS 'User email address (unique identifier)';
COMMENT ON COLUMN user_profile_cache.user_type IS 'Type of user: student or staff';
COMMENT ON COLUMN user_profile_cache.full_name IS 'Full name of the user (first_name + last_name)';
COMMENT ON COLUMN user_profile_cache.identifier IS 'Roll number for students, Staff ID for staff';
COMMENT ON COLUMN user_profile_cache.additional_info IS 'Program name for students, Category for staff';
COMMENT ON COLUMN user_profile_cache.raw_data IS 'Complete raw response from MYJKKN API for debugging';
COMMENT ON COLUMN user_profile_cache.fetched_at IS 'Timestamp when data was last fetched from MYJKKN API';
COMMENT ON COLUMN personal_forms.enable_user_autofetch IS 'Enable automatic fetching of user profile data from MYJKKN';
COMMENT ON COLUMN personal_forms.myjkkn_api_key IS 'API key for MYJKKN application (encrypted in application layer)';
COMMENT ON COLUMN personal_form_responses.user_profile IS 'User profile data attached at submission time (if autofetch enabled)';
