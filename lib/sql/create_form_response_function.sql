-- Create a function to handle form response creation with transaction support
-- This ensures that submission IDs remain sequential even under concurrent submissions

CREATE OR REPLACE FUNCTION create_form_response(
  p_form_id UUID,
  p_response_data JSONB,
  p_submitted_by UUID,
  p_is_anonymous BOOLEAN,
  p_user_email TEXT,
  p_submission_id TEXT,
  p_payment_status TEXT,
  p_payment_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_final_submission_id TEXT := p_submission_id;
  v_timestamp TEXT;
  v_random_suffix TEXT;
  v_retry_count INTEGER := 0;
  v_max_retries CONSTANT INTEGER := 3;
  v_inserted_record RECORD;
BEGIN
  -- Start a transaction to ensure atomicity
  BEGIN
    -- Try to insert with the provided submission ID
    INSERT INTO form_responses (
      form_id,
      response_data,
      submitted_by,
      is_anonymous,
      user_email,
      submission_id,
      payment_status,
      payment_amount
    ) VALUES (
      p_form_id,
      p_response_data,
      p_submitted_by,
      p_is_anonymous,
      p_user_email,
      v_final_submission_id,
      p_payment_status,
      p_payment_amount
    )
    RETURNING * INTO v_inserted_record;
    
    -- If successful, return the inserted record
    v_result := row_to_json(v_inserted_record)::JSONB;
    RETURN v_result;
    
  EXCEPTION
    -- Handle unique constraint violation (duplicate submission ID)
    WHEN unique_violation THEN
      -- If we've already tried too many times, raise an error
      IF v_retry_count >= v_max_retries THEN
        RAISE EXCEPTION 'Failed to generate a unique submission ID after % attempts', v_max_retries;
      END IF;
      
      -- Generate a fallback submission ID with timestamp and random suffix
      v_timestamp := substring(extract(epoch from now())::text, length(extract(epoch from now())::text) - 5);
      v_random_suffix := lpad(floor(random() * 1000)::text, 3, '0');
      
      -- Extract the prefix from the original submission ID (SUB-XXX-)
      v_final_submission_id := substring(p_submission_id from 1 for position('-' in p_submission_id) + 3) 
                             || v_timestamp || v_random_suffix;
      
      -- Increment retry counter
      v_retry_count := v_retry_count + 1;
      
      -- Try again with the new ID (recursive call)
      RETURN create_form_response(
        p_form_id,
        p_response_data,
        p_submitted_by,
        p_is_anonymous,
        p_user_email,
        v_final_submission_id,
        p_payment_status,
        p_payment_amount
      );
  END;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users and anon
GRANT EXECUTE ON FUNCTION create_form_response TO authenticated, anon;
