import api from '@/api/axios';
import type { Project } from '@/types';

interface CreateProjectPayload {
  name: string;
  description?: string;
  key: string;
}

interface UpdateProjectPayload {
  name?: string;
  description?: string;
}

interface AddMemberPayload {
  userId: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export const projectsApi = {
  getAll: async (): Promise<ApiResponse<Project[]>> => {
    const { data } = await api.get('/projects');
    return data;
  },

  getById: async (id: string): Promise<ApiResponse<Project>> => {
    const { data } = await api.get(`/projects/${id}`);
    return data;
  },

  create: async (payload: CreateProjectPayload): Promise<ApiResponse<Project>> => {
    const { data } = await api.post('/projects', payload);
    return data;
  },

  update: async (id: string, payload: UpdateProjectPayload): Promise<ApiResponse<Project>> => {
    const { data } = await api.put(`/projects/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    const { data } = await api.delete(`/projects/${id}`);
    return data;
  },

  addMember: async (projectId: string, payload: AddMemberPayload) => {
    const { data } = await api.post(`/projects/${projectId}/members`, payload);
    return data;
  },

  removeMember: async (projectId: string, memberId: string) => {
    const { data } = await api.delete(`/projects/${projectId}/members/${memberId}`);
    return data;
  },

  updateMemberRole: async (projectId: string, memberId: string, role: string) => {
    const { data } = await api.put(`/projects/${projectId}/members/${memberId}/role`, { role });
    return data;
  },
};
