import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export const speciesKeys = {
  all: ['species'],
  list: (params) => ['species', 'list', params],
  detail: (id) => ['species', 'detail', id],
};

export function useSpeciesList(params = {}) {
  return useQuery({
    queryKey: speciesKeys.list(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.q) sp.set('q', params.q);
      if (params.isActive !== undefined) sp.set('isActive', params.isActive);
      if (params.page) sp.set('page', params.page);
      if (params.limit) sp.set('limit', params.limit);
      const qs = sp.toString();
      return api.get(`/api/species${qs ? `?${qs}` : ''}`);
    },
    keepPreviousData: true,
  });
}

export function useSpecies(id) {
  return useQuery({
    queryKey: speciesKeys.detail(id),
    queryFn: () => api.get(`/api/species/${id}`),
    enabled: !!id,
  });
}

export function useCreateSpecies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/api/species', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: speciesKeys.all }),
  });
}

export function useUpdateSpecies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/api/species/${id}`, patch),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: speciesKeys.all });
      qc.invalidateQueries({ queryKey: speciesKeys.detail(vars.id) });
    },
  });
}

export function useDeleteSpecies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/api/species/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: speciesKeys.all }),
  });
}
