import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchTasksDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchTasks(userId: string, filters: SearchTasksDto) {
    const memberProjects = await this.prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });

    const projectIds = memberProjects.map((m) => m.projectId);

    if (projectIds.length === 0) return [];

    const where: Record<string, unknown> = {
      projectId: { in: projectIds },
    };

    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.type) where.type = filters.type;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;

    if (filters.dueDateFrom || filters.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) (where.dueDate as Record<string, unknown>).gte = new Date(filters.dueDateFrom);
      if (filters.dueDateTo) (where.dueDate as Record<string, unknown>).lte = new Date(filters.dueDateTo);
    }

    return this.prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        labels: { include: { label: true } },
        project: { select: { id: true, name: true, key: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }
}
