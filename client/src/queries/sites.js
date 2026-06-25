import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export const siteKeys = {
  all: ['sites'],
  list: (params) => ['sites', 'list', params],
  detail: (id) => ['sites', 'detail', id],
};

export function useSites(params = {}) {
  return useQuery({
    queryKey: siteKeys.list(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.q) sp.set('q', params.q);
      if (params.owner) sp.set('owner', params.owner);
      if (params.page) sp.set('page', params.page);
      if (params.limit) sp.set('limit', params.limit);
      const qs = sp.toString();
      return api.get(`/api/sites${qs ? `?${qs}` : ''}`);
    },
    keepPreviousData: true,
  });
}

// Capacity-filtered, sponsor-readable site list for the order wizard.
export function useAvailableSites() {
  return useQuery({
    queryKey: ['sites', 'available'],
    queryFn: () => api.get('/api/sites/available'),
    staleTime: 60_000,
  });
}

export function useSite(id) {
  return useQuery({
    queryKey: siteKeys.detail(id),
    queryFn: () => api.get(`/api/sites/${id}`),
    enabled: !!id,
  });
}

// Rich detail for the site page: site + headline stats + recent trees,
// contributors, and volunteers.
export function useSiteOverview(id) {
  return useQuery({
    queryKey: ['sites', 'overview', id],
    queryFn: () => api.get(`/api/sites/${id}/overview`),
    enabled: !!id,
  });
}

// Headline numbers across the caller's sites (e.g. trees still to plant).
export function useMySitesSummary() {
  return useQuery({
    queryKey: ['sites', 'my-summary'],
    queryFn: () => api.get('/api/sites/my-summary'),
    staleTime: 30_000,
  });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/api/sites', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: siteKeys.all }),
  });
}

export function useUpdateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/api/sites/${id}`, patch),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: siteKeys.all });
      qc.invalidateQueries({ queryKey: siteKeys.detail(vars.id) });
    },
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/api/sites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: siteKeys.all }),
  });
}
