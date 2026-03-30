import { Form } from './forms';

export interface FormResponse {
  id: string;
  form_id?: string;
  response_data: Record<string, any>;
  user_email: string;
  submitted_at: string;
  submission_id?: string;
  payment_status?: string;
  payment_amount?: number;
  payment_id?: string;
  payment_updated_at?: string;
  user?: {
    id: string;
    email: string;
    user_metadata: {
      full_name?: string;
      role?: string;
    };
  };
  form?: Form;
  __userInfo?: {
    id: string;
    role?: string;
  };
}
