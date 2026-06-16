import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export const maintenanceKeys = {
  all: ['maintenance'],
  list: (params) => ['maintenance', 'list', params],
};

export function useMaintenance(params = {}) {
  return useQuery({
    queryKey: maintenanceKeys.list(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.plant) sp.set('plant', params.plant);
      if (params.site) sp.set('site', params.site);
      if (params.donor) sp.set('donor', params.donor);
      if (params.page) sp.set('page', params.page);
      if (params.limit) sp.set('limit', params.limit);
      const qs = sp.toString();
      return api.get(`/api/maintenance${qs ? `?${qs}` : ''}`);
    },
    keepPreviousData: true,
  });
}

export function useCreateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/api/maintenance', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: maintenanceKeys.all }),
  });
}

export function useDeleteMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/api/maintenance/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: maintenanceKeys.all }),
  });
}
