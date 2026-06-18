import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.js';
import { donationKeys } from './donations.js';

export const paymentKeys = {
  info: ['payments', 'info'],
  orders: ['payments', 'orders'],
  order: (id) => ['payments', 'orders', id],
};

export function useSponsorshipInfo() {
  return useQuery({
    queryKey: paymentKeys.info,
    queryFn: () => api.get('/api/payments/info'),
    // Pricing rarely changes — give it a longer stale window.
    staleTime: 5 * 60_000,
  });
}

// The sponsor's own orders (each backed by a Donation), with derived
// status + CO₂.
export function useSponsorOrders() {
  return useQuery({
    queryKey: paymentKeys.orders,
    queryFn: () => api.get('/api/payments/orders'),
  });
}

export function useSponsorOrder(id) {
  return useQuery({
    queryKey: paymentKeys.order(id),
    queryFn: () => api.get(`/api/payments/orders/${id}`),
    enabled: !!id,
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
      qc.invalidateQueries({ queryKey: paymentKeys.orders });
    },
  });
}
