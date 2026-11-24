import type {
  AnalyticsResponse,
  EventDetailResponse,
  EventsListResponse,
  FeatureSchemaResponse,
  HealthResponse,
  OrbitalScenesResponse,
  OverviewResponse,
  PredictionResponse,
} from '../types/orbital';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail =
        typeof body.detail === 'string'
          ? body.detail
          : body.detail?.message ?? JSON.stringify(body.detail ?? body);
    } catch {
      // ignore json parse failure
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getHealth: () => requestJson<HealthResponse>('/health'),
  getOverview: () => requestJson<OverviewResponse>('/api/overview'),
  getEvents: (params: {
    search?: string;
    risk_filter?: 'all' | 'high' | 'low';
    object_type?: string;
    max_miss_distance?: number;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
    page?: number;
    page_size?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.risk_filter) qs.set('risk_filter', params.risk_filter);
    if (params.object_type && params.object_type !== 'all') qs.set('object_type', params.object_type);
    if (params.max_miss_distance !== undefined && !Number.isNaN(params.max_miss_distance)) {
      qs.set('max_miss_distance', String(params.max_miss_distance));
    }
    if (params.sort_by) qs.set('sort_by', params.sort_by);
    if (params.sort_dir) qs.set('sort_dir', params.sort_dir);
    if (params.page) qs.set('page', String(params.page));
    if (params.page_size) qs.set('page_size', String(params.page_size));
    return requestJson<EventsListResponse>(`/api/events?${qs.toString()}`);
  },
  getEventDetail: (eventId: number) => requestJson<EventDetailResponse>(`/api/events/${eventId}`),
  getFeatureSchema: () => requestJson<FeatureSchemaResponse>('/api/features/schema'),
  getAnalytics: () => requestJson<AnalyticsResponse>('/api/analytics'),
  getOrbitalScenes: () => requestJson<OrbitalScenesResponse>('/api/orbital-scenes'),
  predict: (features: Record<string, number | string | null>) =>
    requestJson<PredictionResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify({ features }),
    }),
};
