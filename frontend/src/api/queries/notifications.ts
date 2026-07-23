import api from '@/api/axios';
import type { Notification } from '@/types';

interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export const notificationsApi = {
  getAll: async (): Promise<ApiResponse<Notification[]>> => {
    const { data } = await api.get('/notifications');
    return data;
  },

  getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    const { data } = await api.get('/notifications/unread-count');
    return data;
  },

  markAsRead: async (id: string): Promise<ApiResponse<unknown>> => {
    const { data } = await api.put(`/notifications/${id}/read`);
    return data;
  },

  markAllAsRead: async (): Promise<ApiResponse<unknown>> => {
    const { data } = await api.put('/notifications/read-all');
    return data;
  },
};
