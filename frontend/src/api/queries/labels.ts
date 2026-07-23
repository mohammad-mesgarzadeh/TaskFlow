import api from '@/api/axios';
import type { Label } from '@/types';

interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export const labelsApi = {
  getAll: async (projectId: string): Promise<ApiResponse<Label[]>> => {
    const { data } = await api.get(`/projects/${projectId}/labels`);
    return data;
  },

  create: async (projectId: string, payload: { name: string; color?: string }): Promise<ApiResponse<Label>> => {
    const { data } = await api.post(`/projects/${projectId}/labels`, payload);
    return data;
  },

  update: async (labelId: string, payload: { name?: string; color?: string }): Promise<ApiResponse<Label>> => {
    const { data } = await api.put(`/labels/${labelId}`, payload);
    return data;
  },

  delete: async (labelId: string): Promise<ApiResponse<{ message: string }>> => {
    const { data } = await api.delete(`/labels/${labelId}`);
    return data;
  },
};
