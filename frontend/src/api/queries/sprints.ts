import api from '@/api/axios';
import type { Sprint } from '@/types';

interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

interface CreateSprintPayload {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

interface UpdateSprintPayload extends Partial<CreateSprintPayload> {
  isActive?: boolean;
}

export const sprintsApi = {
  getAll: async (projectId: string): Promise<ApiResponse<Sprint[]>> => {
    const { data } = await api.get(`/projects/${projectId}/sprints`);
    return data;
  },

  getById: async (projectId: string, sprintId: string): Promise<ApiResponse<Sprint>> => {
    const { data } = await api.get(`/projects/${projectId}/sprints/${sprintId}`);
    return data;
  },

  create: async (projectId: string, payload: CreateSprintPayload): Promise<ApiResponse<Sprint>> => {
    const { data } = await api.post(`/projects/${projectId}/sprints`, payload);
    return data;
  },

  update: async (projectId: string, sprintId: string, payload: UpdateSprintPayload): Promise<ApiResponse<Sprint>> => {
    const { data } = await api.put(`/projects/${projectId}/sprints/${sprintId}`, payload);
    return data;
  },

  delete: async (projectId: string, sprintId: string): Promise<ApiResponse<{ message: string }>> => {
    const { data } = await api.delete(`/projects/${projectId}/sprints/${sprintId}`);
    return data;
  },

  activate: async (projectId: string, sprintId: string): Promise<ApiResponse<Sprint>> => {
    const { data } = await api.put(`/projects/${projectId}/sprints/${sprintId}/activate`);
    return data;
  },

  assignTasks: async (projectId: string, sprintId: string, taskIds: string[]): Promise<ApiResponse<Sprint>> => {
    const { data } = await api.post(`/projects/${projectId}/sprints/${sprintId}/tasks`, { taskIds });
    return data;
  },

  removeTasks: async (projectId: string, sprintId: string, taskIds: string[]): Promise<ApiResponse<Sprint>> => {
    const { data } = await api.delete(`/projects/${projectId}/sprints/${sprintId}/tasks`, { data: { taskIds } });
    return data;
  },
};
