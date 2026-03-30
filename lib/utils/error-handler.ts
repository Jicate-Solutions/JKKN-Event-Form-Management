import { toast } from 'react-hot-toast';
import { PostgrestError } from '@supabase/supabase-js';

export class ErrorHandler {
  static async handleError(error: unknown, context: string): Promise<void> {
    console.error(`Error in ${context}:`, error);

    if (error instanceof Error) {
      toast.error(error.message);
    } else if ((error as PostgrestError)?.code) {
      const pgError = error as PostgrestError;
      toast.error(`Database error: ${pgError.message}`);
    } else {
      toast.error('An unexpected error occurred');
    }
  }

  static async handleApiResponse<T>(
    promise: Promise<{ data: T | null; error: Error | PostgrestError | null }>,
    context: string
  ): Promise<T | null> {
    try {
      const { data, error } = await promise;
      if (error) {
        await this.handleError(error, context);
        return null;
      }
      return data;
    } catch (error) {
      await this.handleError(error, context);
      return null;
    }
  }

  static createErrorResponse(
    message: string,
    status: number = 500,
    details?: unknown
  ) {
    console.error(`API Error (${status}):`, message, details);
    return new Response(
      JSON.stringify({
        error: message,
        details: details || undefined
      }),
      {
        status,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  static handleAuthError(
    error: unknown,
    redirectTo: string = '/auth/login'
  ): void {
    console.error('Authentication error:', error);

    if (error instanceof Error) {
      toast.error(`Authentication error: ${error.message}`);
    } else {
      toast.error('Authentication failed');
    }

    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }

  static handleValidationError(error: unknown): string[] {
    console.error('Validation error:', error);

    if (error instanceof Error) {
      return [error.message];
    } else if (Array.isArray(error)) {
      return error.map((e) => e.message || 'Invalid input');
    } else if (typeof error === 'string') {
      return [error];
    }

    return ['Validation failed'];
  }
}
