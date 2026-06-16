import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export const donationKeys = {
  all: ['donations'],
  list: (params) => ['donations', 'list', params],
  detail: (id) => ['donations', 'detail', id],
};

export const allocationKeys = {
  all: ['allocations'],
  list: (params) => ['allocations', 'list', params],
};

export function useDonations(params = {}) {
  return useQuery({
    queryKey: donationKeys.list(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.donor) sp.set('donor', params.donor);
      if (params.page) sp.set('page', params.page);
      if (params.limit) sp.set('limit', params.limit);
      const qs = sp.toString();
      return api.get(`/api/donations${qs ? `?${qs}` : ''}`);
    },
    keepPreviousData: true,
  });
}

export function useCreateDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/api/donations', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: donationKeys.all }),
  });
}

export function useUpdateDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/api/donations/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: donationKeys.all }),
  });
}

export function useAllocations(params = {}) {
  return useQuery({
    queryKey: allocationKeys.list(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.donation) sp.set('donation', params.donation);
      if (params.donor) sp.set('donor', params.donor);
      if (params.site) sp.set('site', params.site);
      if (params.page) sp.set('page', params.page);
      if (params.limit) sp.set('limit', params.limit);
      const qs = sp.toString();
      return api.get(`/api/allocations${qs ? `?${qs}` : ''}`);
    },
    keepPreviousData: true,
    enabled: params.enabled !== false,
  });
}

export function useCreateAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/api/allocations', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: allocationKeys.all });
      qc.invalidateQueries({ queryKey: donationKeys.all });
    },
  });
}

export function useUpdateAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/api/allocations/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: allocationKeys.all }),
  });
}

export function useDeleteAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/api/allocations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: allocationKeys.all });
      qc.invalidateQueries({ queryKey: donationKeys.all });
    },
  });
}
