-- Fix: Allow anonymous users to insert personal form responses
-- Issue: Public forms cannot be submitted by unauthenticated users
-- Root cause: GRANT only gives INSERT permission to authenticated users

-- Grant INSERT permission to anonymous users (anon role)
GRANT INSERT ON personal_form_responses TO anon;

-- Grant EXECUTE permission on helper function to anonymous users
GRANT EXECUTE ON FUNCTION can_accept_personal_form_submission TO anon;

-- Verify the fix
DO $$
BEGIN
    RAISE NOTICE 'Personal form responses RLS fix applied successfully!';
    RAISE NOTICE 'Anonymous users can now submit responses to public personal forms';
END $$;
