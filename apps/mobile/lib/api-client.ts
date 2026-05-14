import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import supabase from './auth';
import { getAccessTokenForApi } from './auth';
import { apiFetchJson } from './api-fetch';
import type { Subscription, Invoice } from './types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 90_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RetryConfig = InternalAxiosRequestConfig & { __rejuuv401Retry?: boolean };

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessTokenForApi();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    const ax = error as {
      config?: RetryConfig;
      response?: { status?: number };
    };
    const status = ax.response?.status;
    const cfg = ax.config;
    if (status === 401 && cfg && !cfg.__rejuuv401Retry) {
      const { error: refErr } = await supabase.auth.refreshSession();
      if (refErr) {
        await supabase.auth.signOut();
        return Promise.reject(error);
      }
      cfg.__rejuuv401Retry = true;
      return apiClient.request(cfg);
    }
    if (status === 401) {
      await supabase.auth.signOut();
    }
    return Promise.reject(error);
  }
);

export const api = {
  test: {
    get: () => apiClient.get('/test'),
  },
  assessments: {
    create: (intakeData: unknown) => apiClient.post('/assessments', intakeData),
    getById: (id: string) => apiClient.get(`/assessments/${id}`),
  },
};

export const subscriptionApi = {
  list: async (): Promise<Subscription[]> => {
    const r = await apiFetchJson<{ subscriptions?: Subscription[] }>('/subscriptions');
    if (!r.ok) throw new Error(r.message);
    return r.data.subscriptions ?? [];
  },

  checkout: async (
    subscriptionId?: string,
    trialDays?: number
  ): Promise<{ url?: string; subscription?: Subscription; error?: string }> => {
    const body: Record<string, string | number> = {};
    if (subscriptionId) body.subscription_id = subscriptionId;
    if (trialDays != null && trialDays > 0) body.trial_days = trialDays;
    const r = await apiFetchJson<{ url?: string; subscription?: Subscription; error?: string }>(
      '/subscriptions/checkout',
      { method: 'POST', body: JSON.stringify(body) }
    );
    if (!r.ok) throw new Error(r.message);
    return r.data;
  },

  cancel: async (subscriptionId: string): Promise<Subscription> => {
    const r = await apiFetchJson<{ subscription: Subscription }>('/subscriptions/cancel', {
      method: 'POST',
      body: JSON.stringify({ subscription_id: subscriptionId }),
    });
    if (!r.ok) throw new Error(r.message);
    return r.data.subscription;
  },

  invoices: async (): Promise<Invoice[]> => {
    const r = await apiFetchJson<{ invoices?: Invoice[] }>('/subscriptions/invoices');
    if (!r.ok) throw new Error(r.message);
    return r.data.invoices ?? [];
  },
};

export default apiClient;
