// hooks/use-institutions.ts

import { useState, useCallback, useEffect } from 'react';
import { Institution, InstitutionFilters } from '@/types/organizations';
import { OrganizationService } from '@/lib/services/organization/organization-service';

export function useInstitutions(initialFilters: InstitutionFilters = {}) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InstitutionFilters>(initialFilters);
  const [metadata, setMetadata] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });

  const fetchInstitutions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await OrganizationService.getInstitutions(filters);
      setInstitutions(result.data);
      setMetadata(result.metadata);
    } catch (err) {
      console.error('Error fetching institutions:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  const updateFilters = useCallback(
    (newFilters: Partial<InstitutionFilters>) => {
      setFilters((prev) => ({
        ...prev,
        ...newFilters,
        page: 1
      }));
    },
    []
  );

  const changePage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return {
    institutions,
    loading,
    error,
    metadata,
    filters,
    updateFilters,
    changePage,
    fetchInstitutions
  };
}
