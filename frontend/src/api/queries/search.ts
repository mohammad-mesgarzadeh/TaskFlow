import api from '@/api/axios';
import type { TaskWithProject } from '@/types';

interface SearchFilters {
  q?: string;
  status?: string;
  priority?: string;
  type?: string;
  assigneeId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export const searchApi = {
  searchTasks: async (filters: SearchFilters): Promise<{ data: TaskWithProject[]; statusCode: number; timestamp: string }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const { data } = await api.get(`/search/tasks?${params.toString()}`);
    return data;
  },
};
