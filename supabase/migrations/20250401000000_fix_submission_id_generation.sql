-- Migration: Fix create_personal_form_response RPC submission_id generation
-- Bugs fixed:
-- 1. Prefix extraction: UPPER() was applied AFTER stripping non-uppercase chars
--    e.g. "Solve" -> SUBSTRING "Sol" -> strip [^A-Z0-9] = "S" -> UPPER = "S" (wrong, should be "SOL")
--    Fix: UPPER first, then strip
-- 2. Count was per-form but submission_id unique constraint is global
--    causing collisions when two forms share the same 3-char prefix
--    Fix: Count ALL responses with matching prefix globally
-- 3. Timestamp fallback generated 10-digit epoch seconds, violating CHECK constraint
--    which requires exactly 6 digits: ^SUB-[A-Z0-9]+-[0-9]{6}$
--    Fix: mod 999999 to fit in 6 digits
-- 4. Increased max retries from 5 to 10 for high-concurrency scenarios

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
  v_max_retries INTEGER := 10;
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

  -- FIX #1: UPPER first, THEN strip non-alphanumeric (preserves lowercase letters)
  -- Take up to 10 chars from title to get enough alphanumeric chars
  v_prefix := REGEXP_REPLACE(UPPER(SUBSTRING(v_form_title FROM 1 FOR 10)), '[^A-Z0-9]', '', 'g');
  v_prefix := SUBSTRING(v_prefix FROM 1 FOR 3);
  -- Pad to 3 chars if too short
  IF LENGTH(v_prefix) < 3 THEN
    v_prefix := RPAD(COALESCE(NULLIF(v_prefix, ''), 'SUB'), 3, 'X');
  END IF;

  -- Retry loop for handling duplicate submission_id
  WHILE v_retry_count < v_max_retries LOOP
    BEGIN
      -- FIX #2: Count ALL responses with this prefix globally (not per-form)
      -- because submission_id has a GLOBAL unique constraint
      SELECT COUNT(*) INTO v_count
      FROM personal_form_responses
      WHERE personal_form_responses.submission_id LIKE 'SUB-' || v_prefix || '-%';

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
          -- FIX #3: Mod by 999999 to fit in 6-digit constraint
          v_sequential_number := LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 999999)::TEXT, 6, '0');
          v_submission_id := 'SUB-' || v_prefix || '-' || v_sequential_number;

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
