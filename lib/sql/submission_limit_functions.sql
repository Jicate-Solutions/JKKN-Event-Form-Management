-- Function to get current submission count for a form
CREATE OR REPLACE FUNCTION get_form_submission_count(p_form_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM form_responses
    WHERE form_id = p_form_id;
    
    RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to check if a form can accept more submissions
CREATE OR REPLACE FUNCTION can_accept_submission(p_form_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_submission_limit INTEGER;
    v_current_count INTEGER;
BEGIN
    -- Get the form's submission limit
    SELECT submission_limit
    INTO v_submission_limit
    FROM forms
    WHERE id = p_form_id;
    
    -- If no limit is set, always allow submissions
    IF v_submission_limit IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Get current submission count
    SELECT get_form_submission_count(p_form_id)
    INTO v_current_count;
    
    -- Check if we can accept more submissions
    RETURN v_current_count < v_submission_limit;
END;
$$;

-- Function to get submission statistics for a form (count + limit + remaining)
CREATE OR REPLACE FUNCTION get_form_submission_stats(p_form_id UUID)
RETURNS TABLE (
    current_count INTEGER,
    submission_limit INTEGER,
    remaining_slots INTEGER,
    is_unlimited BOOLEAN,
    can_submit BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_limit INTEGER;
BEGIN
    -- Get current count and limit
    SELECT get_form_submission_count(p_form_id), forms.submission_limit
    INTO v_count, v_limit
    FROM forms
    WHERE forms.id = p_form_id;
    
    RETURN QUERY SELECT
        v_count,
        v_limit,
        CASE 
            WHEN v_limit IS NULL THEN NULL 
            ELSE GREATEST(0, v_limit - v_count)
        END,
        v_limit IS NULL,
        CASE 
            WHEN v_limit IS NULL THEN TRUE
            ELSE v_count < v_limit
        END;
END;
$$;

-- Grant permissions to authenticated users and anon for public forms
GRANT EXECUTE ON FUNCTION get_form_submission_count(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_accept_submission(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_form_submission_stats(UUID) TO authenticated, anon; 