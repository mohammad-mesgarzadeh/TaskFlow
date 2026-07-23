import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { ProjectRole, TaskStatus } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, createTaskDto: CreateTaskDto, userId: string) {
    await this.assertMember(projectId, userId);

    const maxOrder = await this.prisma.task.aggregate({
      where: {
        projectId,
        status: createTaskDto.status || TaskStatus.TODO,
      },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const task = await this.prisma.task.create({
      data: {
        title: createTaskDto.title,
        description: createTaskDto.description,
        status: createTaskDto.status || TaskStatus.TODO,
        priority: createTaskDto.priority,
        type: createTaskDto.type,
        order: nextOrder,
        dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
        projectId,
        assigneeId: createTaskDto.assigneeId || null,
        labels: createTaskDto.labelIds?.length
          ? {
              create: createTaskDto.labelIds.map((labelId) => ({
                labelId,
              })),
            }
          : undefined,
      },
      include: this.taskInclude(),
    });

    await this.logActivity({
      action: 'CREATED',
      entityType: 'Task',
      entityId: task.id,
      taskId: task.id,
      userId,
      metadata: { title: task.title },
    });

    return task;
  }

  async findAll(projectId: string, userId: string) {
    await this.assertMember(projectId, userId);

    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      include: this.taskInclude(),
      orderBy: [{ status: 'asc' }, { order: 'asc' }],
    });

    return tasks;
  }

  async findOne(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: this.taskInclude(),
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.assertMember(task.projectId, userId);

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string) {
    const existing = await this.prisma.task.findUnique({
      where: { id },
      include: { labels: true },
    });

    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    await this.assertMember(existing.projectId, userId);

    const changes: Record<string, unknown> = {};
    if (updateTaskDto.title !== undefined) changes.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined) changes.description = updateTaskDto.description;
    if (updateTaskDto.status !== undefined) changes.status = updateTaskDto.status;
    if (updateTaskDto.priority !== undefined) changes.priority = updateTaskDto.priority;
    if (updateTaskDto.type !== undefined) changes.type = updateTaskDto.type;
    if (updateTaskDto.dueDate !== undefined) changes.dueDate = updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : null;
    if (updateTaskDto.assigneeId !== undefined) changes.assigneeId = updateTaskDto.assigneeId || null;

    if (updateTaskDto.status !== undefined && updateTaskDto.status !== existing.status) {
      const maxOrder = await this.prisma.task.aggregate({
        where: {
          projectId: existing.projectId,
          status: updateTaskDto.status,
        },
        _max: { order: true },
      });
      changes.order = (maxOrder._max.order ?? -1) + 1;
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...changes,
        labels: updateTaskDto.labelIds
          ? {
              deleteMany: {},
              create: updateTaskDto.labelIds.map((labelId) => ({
                labelId,
              })),
            }
          : undefined,
      },
      include: this.taskInclude(),
    });

    if (updateTaskDto.status && updateTaskDto.status !== existing.status) {
      await this.logActivity({
        action: 'STATUS_CHANGED',
        entityType: 'Task',
        entityId: task.id,
        taskId: task.id,
        userId,
        metadata: { from: existing.status, to: updateTaskDto.status },
      });
    }

    if (updateTaskDto.assigneeId !== undefined && updateTaskDto.assigneeId !== existing.assigneeId) {
      await this.logActivity({
        action: updateTaskDto.assigneeId ? 'ASSIGNED' : 'UNASSIGNED',
        entityType: 'Task',
        entityId: task.id,
        taskId: task.id,
        userId,
        metadata: { assigneeId: updateTaskDto.assigneeId },
      });
    }

    if (updateTaskDto.priority && updateTaskDto.priority !== existing.priority) {
      await this.logActivity({
        action: 'PRIORITY_CHANGED',
        entityType: 'Task',
        entityId: task.id,
        taskId: task.id,
        userId,
        metadata: { from: existing.priority, to: updateTaskDto.priority },
      });
    }

    return task;
  }

  async remove(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.assertMember(task.projectId, userId);

    await this.prisma.task.delete({ where: { id } });

    await this.logActivity({
      action: 'DELETED',
      entityType: 'Task',
      entityId: id,
      userId,
      metadata: { title: task.title },
    });

    return { message: 'Task deleted successfully' };
  }

  async bulkReorder(tasks: { taskId: string; status: TaskStatus; order: number }[], userId: string) {
    const updates = tasks.map((t) =>
      this.prisma.task.update({
        where: { id: t.taskId },
        data: { status: t.status, order: t.order },
      })
    );

    await this.prisma.$transaction(updates);

    return { message: 'Tasks reordered successfully' };
  }

  private taskInclude() {
    return {
      assignee: {
        select: { id: true, name: true, email: true },
      },
      labels: {
        include: {
          label: true,
        },
      },
      _count: {
        select: { comments: true },
      },
    };
  }

  private async assertMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId, projectId },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this project');
    }

    return member;
  }

  private async logActivity(data: {
    action: string;
    entityType: string;
    entityId: string;
    taskId?: string;
    userId: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.prisma.activity.create({
      data: {
        action: data.action as 'CREATED',
        entityType: data.entityType,
        entityId: data.entityId,
        taskId: data.taskId || null,
        userId: data.userId,
        ...(data.metadata ? { metadata: data.metadata as unknown as Record<string, string> } : {}),
      },
    });
  }
}
