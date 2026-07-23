import api from '@/api/axios';
import type { User } from '@/types';

interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export const usersApi = {
  getAll: async (): Promise<ApiResponse<User[]>> => {
    const { data } = await api.get('/users');
    return data;
  },

  getById: async (id: string): Promise<ApiResponse<User>> => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },
};
