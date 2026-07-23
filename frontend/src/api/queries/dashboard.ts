import api from '@/api/axios';
import type { Activity } from '@/types';

interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  tasksByType: Record<string, number>;
  myAssignedTasks: number;
  overdueTasks: number;
  completedTasks: number;
  recentActivities: (Activity & { task: { id: string; title: string } | null })[];
}

interface ProjectStats {
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  tasksByType: Record<string, number>;
  activeSprint: { id: string; name: string; _count: { tasks: number } } | null;
  recentActivities: (Activity & { task: { id: string; title: string } | null })[];
}

interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export const dashboardApi = {
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    const { data } = await api.get('/dashboard/stats');
    return data;
  },

  getProjectStats: async (projectId: string): Promise<ApiResponse<ProjectStats>> => {
    const { data } = await api.get(`/dashboard/projects/${projectId}/stats`);
    return data;
  },
};
