import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export const assignmentKeys = {
  all: ['assignments'],
  list: (params) => ['assignments', 'list', params],
};

export function useAssignments(params = {}) {
  return useQuery({
    queryKey: assignmentKeys.list(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.volunteer) sp.set('volunteer', params.volunteer);
      if (params.site) sp.set('site', params.site);
      if (params.kind) sp.set('kind', params.kind);
      if (params.active != null) sp.set('active', String(params.active));
      if (params.page) sp.set('page', params.page);
      if (params.limit) sp.set('limit', params.limit);
      const qs = sp.toString();
      return api.get(`/api/assignments${qs ? `?${qs}` : ''}`);
    },
    keepPreviousData: true,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/api/assignments', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/api/assignments/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/api/assignments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}
