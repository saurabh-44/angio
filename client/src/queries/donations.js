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
      if (params.status) sp.set('status', params.status);
      if (params.assignment) sp.set('assignment', params.assignment);
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

// Existing unsponsored trees on an allocation's site that can be assigned
// to it, plus how many more the order still needs. Only fetched when a
// picker is opened (enabled gate), so it doesn't run for every row.
export function useAttachablePlants(allocationId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['allocations', 'attachable', allocationId],
    queryFn: () => api.get(`/api/allocations/${allocationId}/attachable-plants`),
    enabled: enabled && !!allocationId,
  });
}

export function useAttachPlants() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ allocationId, plantIds }) =>
      api.post(`/api/allocations/${allocationId}/attach-plants`, { plantIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: allocationKeys.all });
      qc.invalidateQueries({ queryKey: donationKeys.all });
      qc.invalidateQueries({ queryKey: ['allocations', 'attachable'] });
      qc.invalidateQueries({ queryKey: ['plants'] });
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
