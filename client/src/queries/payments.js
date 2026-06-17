import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.js';
import { donationKeys } from './donations.js';

export const paymentKeys = {
  info: ['payments', 'info'],
};

export function useSponsorshipInfo() {
  return useQuery({
    queryKey: paymentKeys.info,
    queryFn: () => api.get('/api/payments/info'),
    // Pricing rarely changes — give it a longer stale window.
    staleTime: 5 * 60_000,
  });
}

export function useCreateSponsorOrder() {
  return useMutation({
    mutationFn: (body) => api.post('/api/payments/orders', body),
  });
}

export function useVerifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/api/payments/verify', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: donationKeys.all });
    },
  });
}
