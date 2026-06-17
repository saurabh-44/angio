import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export const analyticsKeys = {
  overview: ['analytics', 'overview'],
};

// Single overview call drives the entire admin home charts strip.
// `staleTime` matches the server `Cache-Control: max-age=15` so we
// don't refetch on tab focus while it's still fresh.
export function useAdminOverview() {
  return useQuery({
    queryKey: analyticsKeys.overview,
    queryFn: () => api.get('/api/analytics/overview'),
    staleTime: 15_000,
  });
}
