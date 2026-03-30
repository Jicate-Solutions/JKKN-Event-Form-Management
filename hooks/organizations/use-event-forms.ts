import { useState, useCallback, useEffect } from 'react';
import { Form } from '@/types/forms';
import { FormService } from '@/lib/services/form-service';
import { toast } from 'react-hot-toast';

export function useEventForms(eventId: string) {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await FormService.getEventForms(eventId);
      setForms(data as unknown as Form[]);
    } catch (err) {
      console.error('Error fetching event forms:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch forms');
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  return {
    forms,
    loading,
    error,
    fetchForms,
    refetch: fetchForms
  };
}
