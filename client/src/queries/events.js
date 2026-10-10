import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export const eventKeys = {
  all: ['events'],
  list: (params) => ['events', 'list', params],
  detail: (id) => ['events', 'detail', id],
  audience: (params) => ['events', 'audience', params],
  invites: ['events', 'invites'],
};

// Admin / site in-charge table of upcoming events.
export function useEvents(params = {}) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.q) sp.set('q', params.q);
      const qs = sp.toString();
      return api.get(`/api/events${qs ? `?${qs}` : ''}`);
    },
    keepPreviousData: true,
  });
}

export function useEvent(id) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => api.get(`/api/events/${id}`),
    enabled: !!id,
  });
}

// Who a new event would invite — shown in the create form so the
// creator can untick people before posting.
export function useEventAudience({ site, audience }) {
  return useQuery({
    queryKey: eventKeys.audience({ site, audience }),
    queryFn: () => api.get(`/api/events/audience?site=${site}&audience=${audience}`),
    enabled: !!site,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/api/events', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  });
}

export function useCancelEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/api/events/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  });
}

// Volunteer's open event requests (the header bell). Polls so a new
// event shows up without a reload.
export function useEventInvites({ enabled = true } = {}) {
  return useQuery({
    queryKey: eventKeys.invites,
    queryFn: () => api.get('/api/events/invites'),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useRespondToEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, response }) => api.post(`/api/events/${id}/respond`, { response }),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  });
}
