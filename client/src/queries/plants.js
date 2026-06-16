import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export const plantKeys = {
  all: ['plants'],
  list: (params) => ['plants', 'list', params],
  detail: (id) => ['plants', 'detail', id],
};

export function usePlants(params = {}) {
  return useQuery({
    queryKey: plantKeys.list(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.site) sp.set('site', params.site);
      if (params.donor) sp.set('donor', params.donor);
      if (params.allocation) sp.set('allocation', params.allocation);
      if (params.status) sp.set('status', params.status);
      if (params.page) sp.set('page', params.page);
      if (params.limit) sp.set('limit', params.limit);
      const qs = sp.toString();
      return api.get(`/api/plants${qs ? `?${qs}` : ''}`);
    },
    keepPreviousData: true,
  });
}

export function usePlant(id) {
  return useQuery({
    queryKey: plantKeys.detail(id),
    queryFn: () => api.get(`/api/plants/${id}`),
    enabled: !!id,
  });
}

export function useCreatePlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/api/plants', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: plantKeys.all }),
  });
}

export function useUpdatePlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/api/plants/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: plantKeys.all }),
  });
}

export function useDeletePlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/api/plants/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: plantKeys.all }),
  });
}
