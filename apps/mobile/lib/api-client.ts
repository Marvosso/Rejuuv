import axios, { AxiosInstance } from 'axios';
import { getSession } from './auth';
import type { Subscription, Invoice } from './types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  test: {
    get: () => apiClient.get('/test'),
  },
  assessments: {
    create: (intakeData: any) => apiClient.post('/assessments', intakeData),
    getById: (id: string) => apiClient.get(`/assessments/${id}`),
  },
};

// ─── Subscription helpers (use native fetch to match project patterns) ────────

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

export const subscriptionApi = {
  /** GET /api/subscriptions — returns Rejuuv subscriptions only */
  list: async (): Promise<Subscription[]> => {
    const res = await fetch(`${BASE_URL}/subscriptions`, {
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch subscriptions');
    const json = await res.json();
    return json.subscriptions ?? [];
  },

  /**
   * POST /api/subscriptions/checkout
   * Returns { url } for new subscriptions or { subscription } for upgrades.
   */
  checkout: async (subscriptionId?: string): Promise<{ url?: string; subscription?: Subscription }> => {
    const body: Record<string, string> = {};
    if (subscriptionId) body.subscription_id = subscriptionId;
    const res = await fetch(`${BASE_URL}/subscriptions/checkout`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Checkout failed');
    }
    return res.json();
  },

  /** POST /api/subscriptions/cancel — schedules cancellation at period end */
  cancel: async (subscriptionId: string): Promise<Subscription> => {
    const res = await fetch(`${BASE_URL}/subscriptions/cancel`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ subscription_id: subscriptionId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Cancellation failed');
    }
    const json = await res.json();
    return json.subscription;
  },

  /** GET /api/subscriptions/invoices — returns Rejuuv invoices only */
  invoices: async (): Promise<Invoice[]> => {
    const res = await fetch(`${BASE_URL}/subscriptions/invoices`, {
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch invoices');
    const json = await res.json();
    return json.invoices ?? [];
  },
};

export default apiClient;
