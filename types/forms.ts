export type FormFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'time'
  | 'file'
  | 'signature'
  | 'payment'
  | 'conditional'
  | 'image';

export type ConditionalRuleState =
  | 'is_empty'
  | 'is_filled'
  | 'before'
  | 'after'
  | 'equal_to_date'
  | 'not_equal_to_date'
  | 'equal_to_day'
  | 'not_equal_to_day'
  | 'is_equal'
  | 'is_not_equal'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'age_greater_than_or_equal'
  | 'age_less_than';

export type ConditionalRuleAction =
  | 'show'
  | 'hide'
  | 'show_multiple'
  | 'hide_multiple';

export interface ConditionalRule {
  id: string;
  source_field_id: string; // Field ID to monitor for conditions
  state: ConditionalRuleState; // Type of condition
  value?: string; // Optional value for the condition
  action: ConditionalRuleAction; // What to do when condition is met
  target_field_ids: string[]; // Fields to show/hide based on the action
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select, radio, checkbox
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  accept?: string; // Add this for file input types
  uppercase?: boolean; // Force input to uppercase
  payment_amount?: number;
  payment_currency?: string;
  payment_description?: string;
  image_url?: string; // For image field type

  // For conditional fields
  condition_options?: string[]; // Options like Yes/No
  conditional_trigger_value?: string; // Which value triggers showing the conditional input
  conditional_input_type?: string; // Type of conditional input field
  conditional_label?: string; // Label for the conditional input
  conditional_placeholder?: string; // Placeholder for the conditional input

  // Advanced conditional logic
  conditional_rules?: ConditionalRule[];
}

export interface Form {
  id: string;
  title: string;
  description?: string;
  banner_url?: string;
  is_public: boolean;
  institution_id: string;
  event_id?: string;
  fields: FormField[];
  status: 'draft' | 'published' | 'archived';
  submission_limit?: number; // Optional submission limit - if set, limits number of submissions
  slug?: string; // SEO-friendly URL slug generated from title
  created_by: string;
  created_at: string;
  updated_at: string;
}
