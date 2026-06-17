import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export const publicTreeKeys = {
  detail: (code) => ['public-tree', code],
};

// Read the public tree info for a scanned QR. No auth required server-side
// but cookies are still sent (credentials: include) — backend ignores them.
export function usePublicTree(code) {
  return useQuery({
    queryKey: publicTreeKeys.detail(code),
    queryFn: () => api.get(`/api/public/trees/${code}`),
    enabled: !!code,
    staleTime: 60_000,
  });
}
