import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export const userKeys = {
  all: ['users'],
  list: (params) => ['users', 'list', params],
  detail: (id) => ['users', 'detail', id],
};

export function useUsers(params = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.role) sp.set('role', params.role);
      if (params.q) sp.set('q', params.q);
      if (params.page) sp.set('page', params.page);
      if (params.limit) sp.set('limit', params.limit);
      const qs = sp.toString();
      return api.get(`/api/users${qs ? `?${qs}` : ''}`);
    },
    keepPreviousData: true,
  });
}

export function useUser(id) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => api.get(`/api/users/${id}`),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/api/users', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/api/users/${id}`, patch),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      qc.invalidateQueries({ queryKey: userKeys.detail(vars.id) });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/api/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (id) => api.post(`/api/users/${id}/reset-password`),
  });
}
