-- Migration: Add RPC functions for personal form response submission with atomic submission_id generation
-- This prevents duplicate submission_id errors when multiple users submit simultaneously

-- Function to check if a personal form can accept new submissions
CREATE OR REPLACE FUNCTION can_accept_personal_form_submission(form_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  form_record RECORD;
  current_count INTEGER;
BEGIN
  -- Get form with submission limit
  SELECT submission_limit INTO form_record
  FROM personal_forms
  WHERE id = form_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Form not found';
  END IF;

  -- If no limit set, always accept
  IF form_record.submission_limit IS NULL OR form_record.submission_limit = 0 THEN
    RETURN TRUE;
  END IF;

  -- Count current responses
  SELECT COUNT(*) INTO current_count
  FROM personal_form_responses
  WHERE personal_form_id = form_id;

  -- Check if under limit
  RETURN current_count < form_record.submission_limit;
END;
$$;

-- Function to create a personal form response with atomic submission_id generation
-- Includes retry logic to handle duplicate submission_id errors
CREATE OR REPLACE FUNCTION create_personal_form_response(
  p_personal_form_id UUID,
  p_response_data JSONB,
  p_user_email TEXT DEFAULT NULL,
  p_submitted_by UUID DEFAULT NULL,
  p_is_anonymous BOOLEAN DEFAULT TRUE,
  p_user_profile JSONB DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  submission_id TEXT,
  personal_form_id UUID,
  response_data JSONB,
  user_email TEXT,
  submitted_by UUID,
  is_anonymous BOOLEAN,
  user_profile JSONB,
  submitted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission_id TEXT;
  v_prefix TEXT;
  v_form_title TEXT;
  v_count INTEGER;
  v_sequential_number TEXT;
  v_retry_count INTEGER := 0;
  v_max_retries INTEGER := 5;
  v_result RECORD;
BEGIN
  -- Check if form can accept submissions
  IF NOT can_accept_personal_form_submission(p_personal_form_id) THEN
    RAISE EXCEPTION 'Form has reached its submission limit';
  END IF;

  -- Get form title for prefix generation
  SELECT title INTO v_form_title
  FROM personal_forms
  WHERE personal_forms.id = p_personal_form_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Form not found';
  END IF;

  -- Generate prefix from form title (first 3 chars, uppercase, alphanumeric only)
  v_prefix := UPPER(REGEXP_REPLACE(SUBSTRING(v_form_title FROM 1 FOR 3), '[^A-Z0-9]', '', 'g'));
  IF v_prefix = '' THEN
    v_prefix := 'SUB';
  END IF;

  -- Retry loop for handling duplicate submission_id
  WHILE v_retry_count < v_max_retries LOOP
    BEGIN
      -- Get current count atomically
      SELECT COUNT(*) INTO v_count
      FROM personal_form_responses
      WHERE personal_form_responses.personal_form_id = p_personal_form_id;

      -- Generate sequential number with padding
      v_sequential_number := LPAD((v_count + 1 + v_retry_count)::TEXT, 6, '0');
      v_submission_id := 'SUB-' || v_prefix || '-' || v_sequential_number;

      -- Attempt insert
      INSERT INTO personal_form_responses (
        personal_form_id,
        submission_id,
        response_data,
        user_email,
        submitted_by,
        is_anonymous,
        user_profile,
        submitted_at
      ) VALUES (
        p_personal_form_id,
        v_submission_id,
        p_response_data,
        p_user_email,
        p_submitted_by,
        p_is_anonymous,
        p_user_profile,
        NOW()
      )
      RETURNING * INTO v_result;

      -- Success! Return the result
      RETURN QUERY SELECT
        v_result.id,
        v_result.submission_id,
        v_result.personal_form_id,
        v_result.response_data,
        v_result.user_email,
        v_result.submitted_by,
        v_result.is_anonymous,
        v_result.user_profile,
        v_result.submitted_at;
      RETURN;

    EXCEPTION
      WHEN unique_violation THEN
        -- Duplicate submission_id, retry with incremented count
        v_retry_count := v_retry_count + 1;

        IF v_retry_count >= v_max_retries THEN
          -- If max retries reached, use timestamp-based fallback
          v_submission_id := 'SUB-' || v_prefix || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;

          INSERT INTO personal_form_responses (
            personal_form_id,
            submission_id,
            response_data,
            user_email,
            submitted_by,
            is_anonymous,
            user_profile,
            submitted_at
          ) VALUES (
            p_personal_form_id,
            v_submission_id,
            p_response_data,
            p_user_email,
            p_submitted_by,
            p_is_anonymous,
            p_user_profile,
            NOW()
          )
          RETURNING * INTO v_result;

          RETURN QUERY SELECT
            v_result.id,
            v_result.submission_id,
            v_result.personal_form_id,
            v_result.response_data,
            v_result.user_email,
            v_result.submitted_by,
            v_result.is_anonymous,
            v_result.user_profile,
            v_result.submitted_at;
          RETURN;
        END IF;

        -- Otherwise, continue loop to retry
        CONTINUE;
    END;
  END LOOP;

  RAISE EXCEPTION 'Failed to create response after maximum retries';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_accept_personal_form_submission TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_personal_form_response TO authenticated, anon;
