import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string) {
    const memberProjects = await this.prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = memberProjects.map((m) => m.projectId);

    if (projectIds.length === 0) {
      return {
        totalProjects: 0,
        totalTasks: 0,
        tasksByStatus: { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 },
        tasksByPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
        tasksByType: { BUG: 0, FEATURE: 0, TASK: 0, STORY: 0 },
        myAssignedTasks: 0,
        overdueTasks: 0,
        completedTasks: 0,
        recentActivities: [],
      };
    }

    const [totalProjects, tasks, myTasks, overdueTasks] = await Promise.all([
      this.prisma.project.count({ where: { id: { in: projectIds } } }),
      this.prisma.task.groupBy({
        by: ['status', 'priority', 'type'],
        where: { projectId: { in: projectIds } },
        _count: true,
      }),
      this.prisma.task.count({
        where: { projectId: { in: projectIds }, assigneeId: userId },
      }),
      this.prisma.task.count({
        where: {
          projectId: { in: projectIds },
          assigneeId: userId,
          dueDate: { lt: new Date() },
          status: { not: 'DONE' },
        },
      }),
    ]);

    const tasksByStatus = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
    const tasksByPriority = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    const tasksByType = { BUG: 0, FEATURE: 0, TASK: 0, STORY: 0 };
    let totalTasks = 0;
    let completedTasks = 0;

    for (const group of tasks) {
      totalTasks += group._count;
      tasksByStatus[group.status as keyof typeof tasksByStatus] += group._count;
      tasksByPriority[group.priority as keyof typeof tasksByPriority] += group._count;
      tasksByType[group.type as keyof typeof tasksByType] += group._count;
      if (group.status === 'DONE') completedTasks += group._count;
    }

    const recentActivities = await this.prisma.activity.findMany({
      where: { task: { projectId: { in: projectIds } } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      totalProjects,
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      tasksByType,
      myAssignedTasks: myTasks,
      overdueTasks,
      completedTasks,
      recentActivities,
    };
  }

  async getProjectStats(projectId: string, userId: string) {
    await this.assertMember(projectId, userId);

    const [tasks, sprintInfo, recentActivities] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['status', 'priority', 'type'],
        where: { projectId },
        _count: true,
      }),
      this.prisma.sprint.findFirst({
        where: { projectId, isActive: true },
        include: { _count: { select: { tasks: true } } },
      }),
      this.prisma.activity.findMany({
        where: { task: { projectId } },
        include: {
          user: { select: { id: true, name: true, email: true } },
          task: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    const tasksByStatus = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
    const tasksByPriority = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    const tasksByType = { BUG: 0, FEATURE: 0, TASK: 0, STORY: 0 };
    let totalTasks = 0;

    for (const group of tasks) {
      totalTasks += group._count;
      tasksByStatus[group.status as keyof typeof tasksByStatus] += group._count;
      tasksByPriority[group.priority as keyof typeof tasksByPriority] += group._count;
      tasksByType[group.type as keyof typeof tasksByType] += group._count;
    }

    return {
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      tasksByType,
      activeSprint: sprintInfo,
      recentActivities,
    };
  }

  private async assertMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (!member) {
      const { ForbiddenException } = await import('@nestjs/common');
      throw new ForbiddenException('You are not a member of this project');
    }
    return member;
  }
}
