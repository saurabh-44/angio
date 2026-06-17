import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export const co2Keys = {
  donor: ['co2', 'me'],
  system: ['co2', 'system'],
};

// Donor-facing CO₂ summary across all funded trees.
export function useDonorCo2() {
  return useQuery({
    queryKey: co2Keys.donor,
    queryFn: () => api.get('/api/co2/me'),
    staleTime: 60_000,
  });
}

// NGO admin overview metric. Not used yet but added for symmetry —
// drop into the admin home stat row later.
export function useSystemCo2() {
  return useQuery({
    queryKey: co2Keys.system,
    queryFn: () => api.get('/api/co2/system'),
    staleTime: 60_000,
  });
}
