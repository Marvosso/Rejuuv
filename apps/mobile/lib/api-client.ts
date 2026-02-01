import axios, { AxiosInstance } from 'axios';

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
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

export default apiClient;
