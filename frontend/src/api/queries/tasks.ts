import api from '@/api/axios';
import type { Task, TaskStatus } from '@/types';

interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: string;
  type?: string;
  dueDate?: string;
  assigneeId?: string;
  labelIds?: string[];
}

interface UpdateTaskPayload extends Partial<CreateTaskPayload> {}

interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export const tasksApi = {
  getAll: async (projectId: string): Promise<ApiResponse<Task[]>> => {
    const { data } = await api.get(`/projects/${projectId}/tasks`);
    return data;
  },

  getById: async (projectId: string, taskId: string): Promise<ApiResponse<Task>> => {
    const { data } = await api.get(`/projects/${projectId}/tasks/${taskId}`);
    return data;
  },

  create: async (projectId: string, payload: CreateTaskPayload): Promise<ApiResponse<Task>> => {
    const { data } = await api.post(`/projects/${projectId}/tasks`, payload);
    return data;
  },

  update: async (projectId: string, taskId: string, payload: UpdateTaskPayload): Promise<ApiResponse<Task>> => {
    const { data } = await api.put(`/projects/${projectId}/tasks/${taskId}`, payload);
    return data;
  },

  delete: async (projectId: string, taskId: string): Promise<ApiResponse<{ message: string }>> => {
    const { data } = await api.delete(`/projects/${projectId}/tasks/${taskId}`);
    return data;
  },

  bulkReorder: async (projectId: string, tasks: { taskId: string; status: TaskStatus; order: number }[]) => {
    const { data } = await api.put(`/projects/${projectId}/tasks/reorder/bulk`, { tasks });
    return data;
  },
};
