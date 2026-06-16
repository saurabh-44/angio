import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Most dashboard data is fine for ~30s before refetch. Real-time-ish
      // values (planting feed) override per-query.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        // Don't retry auth-required errors — let the API client refresh
        // once. Don't retry validation errors.
        const status = error?.status;
        if (status === 401 || status === 403 || status === 400 || status === 404) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
