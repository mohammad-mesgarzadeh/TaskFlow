export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export const ProjectRole = {
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
} as const;

export type ProjectRole = (typeof ProjectRole)[keyof typeof ProjectRole];

export interface ProjectMember {
  id: string;
  role: ProjectRole;
  userId: string;
  projectId: string;
  user: User;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  key: string;
  ownerId: string;
  owner: User;
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
}

export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TaskType = {
  BUG: 'BUG',
  FEATURE: 'FEATURE',
  TASK: 'TASK',
  STORY: 'STORY',
} as const;

export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export interface Label {
  id: string;
  name: string;
  color: string;
  projectId: string;
}

export interface TaskLabel {
  taskId: string;
  labelId: string;
  label: Label;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  order: number;
  dueDate: string | null;
  projectId: string;
  assigneeId: string | null;
  assignee: User | null;
  sprintId: string | null;
  labels: TaskLabel[];
  _count?: { comments: number };
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  author: User;
  createdAt: string;
  updatedAt: string;
}

export const ActivityAction = {
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  DELETED: 'DELETED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  ASSIGNED: 'ASSIGNED',
  UNASSIGNED: 'UNASSIGNED',
  LABEL_ADDED: 'LABEL_ADDED',
  LABEL_REMOVED: 'LABEL_REMOVED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  PRIORITY_CHANGED: 'PRIORITY_CHANGED',
  SPRINT_CREATED: 'SPRINT_CREATED',
  SPRINT_UPDATED: 'SPRINT_UPDATED',
  SPRINT_TASK_ADDED: 'SPRINT_TASK_ADDED',
  SPRINT_TASK_REMOVED: 'SPRINT_TASK_REMOVED',
} as const;

export type ActivityAction = (typeof ActivityAction)[keyof typeof ActivityAction];

export interface Activity {
  id: string;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  taskId: string | null;
  userId: string;
  user: User;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuthResponse {
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
  statusCode: number;
  timestamp: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  projectId: string;
  _count?: { tasks: number };
  tasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  userId: string;
  entityId: string | null;
  entityType: string | null;
  createdAt: string;
}

export interface TaskWithProject extends Task {
  project: { id: string; name: string; key: string };
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  timestamp: string;
}
