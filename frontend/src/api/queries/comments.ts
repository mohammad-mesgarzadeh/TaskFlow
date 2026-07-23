import api from '@/api/axios';
import type { Comment } from '@/types';

interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export const commentsApi = {
  getAll: async (taskId: string): Promise<ApiResponse<Comment[]>> => {
    const { data } = await api.get(`/tasks/${taskId}/comments`);
    return data;
  },

  create: async (taskId: string, content: string): Promise<ApiResponse<Comment>> => {
    const { data } = await api.post(`/tasks/${taskId}/comments`, { content });
    return data;
  },

  update: async (commentId: string, content: string): Promise<ApiResponse<Comment>> => {
    const { data } = await api.put(`/tasks/${commentId}`, { content });
    return data;
  },

  delete: async (commentId: string): Promise<ApiResponse<{ message: string }>> => {
    const { data } = await api.delete(`/tasks/${commentId}`);
    return data;
  },
};
