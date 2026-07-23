import api from '@/api/axios';
import type { Activity } from '@/types';

interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export const activitiesApi = {
  getByTask: async (taskId: string): Promise<ApiResponse<Activity[]>> => {
    const { data } = await api.get(`/tasks/${taskId}/activities`);
    return data;
  },

  getByProject: async (projectId: string, limit = 50): Promise<ApiResponse<Activity[]>> => {
    const { data } = await api.get(`/projects/${projectId}/activities`, {
      params: { limit },
    });
    return data;
  },
};
