import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { TaskStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(
    projectId: string,
    createTaskDto: CreateTaskDto,
    userId: string,
  ) {
    await this.assertMember(projectId, userId);
    await this.assertAssigneesAreMembers(projectId, createTaskDto.assigneeId);
    await this.assertLabelsBelongToProject(projectId, createTaskDto.labelIds);

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

    if (createTaskDto.assigneeId && createTaskDto.assigneeId !== userId) {
      await this.notifyAssignee(
        createTaskDto.assigneeId,
        'TASK_ASSIGNED',
        'Task assigned to you',
        `"${task.title}" has been assigned to you`,
        task.id,
      );
    }

    this.notificationsGateway.emitTaskCreated(projectId, task);

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
    await this.assertAssigneesAreMembers(
      existing.projectId,
      updateTaskDto.assigneeId,
    );
    await this.assertLabelsBelongToProject(
      existing.projectId,
      updateTaskDto.labelIds,
    );

    const changes: Record<string, unknown> = {};
    if (updateTaskDto.title !== undefined) changes.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined)
      changes.description = updateTaskDto.description;
    if (updateTaskDto.status !== undefined)
      changes.status = updateTaskDto.status;
    if (updateTaskDto.priority !== undefined)
      changes.priority = updateTaskDto.priority;
    if (updateTaskDto.type !== undefined) changes.type = updateTaskDto.type;
    if (updateTaskDto.dueDate !== undefined)
      changes.dueDate = updateTaskDto.dueDate
        ? new Date(updateTaskDto.dueDate)
        : null;
    if (updateTaskDto.assigneeId !== undefined)
      changes.assigneeId = updateTaskDto.assigneeId || null;

    if (
      updateTaskDto.status !== undefined &&
      updateTaskDto.status !== existing.status
    ) {
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

      if (existing.assigneeId && existing.assigneeId !== userId) {
        await this.notifyAssignee(
          existing.assigneeId,
          'TASK_STATUS_CHANGED',
          'Task status updated',
          `"${task.title}" moved to ${updateTaskDto.status.replace('_', ' ')}`,
          task.id,
        );
      }
    }

    if (
      updateTaskDto.assigneeId !== undefined &&
      updateTaskDto.assigneeId !== existing.assigneeId
    ) {
      await this.logActivity({
        action: updateTaskDto.assigneeId ? 'ASSIGNED' : 'UNASSIGNED',
        entityType: 'Task',
        entityId: task.id,
        taskId: task.id,
        userId,
        metadata: { assigneeId: updateTaskDto.assigneeId },
      });

      if (updateTaskDto.assigneeId && updateTaskDto.assigneeId !== userId) {
        await this.notifyAssignee(
          updateTaskDto.assigneeId,
          'TASK_ASSIGNED',
          'Task assigned to you',
          `"${task.title}" has been assigned to you`,
          task.id,
        );
      }
    }

    if (
      updateTaskDto.priority &&
      updateTaskDto.priority !== existing.priority
    ) {
      await this.logActivity({
        action: 'PRIORITY_CHANGED',
        entityType: 'Task',
        entityId: task.id,
        taskId: task.id,
        userId,
        metadata: { from: existing.priority, to: updateTaskDto.priority },
      });

      if (existing.assigneeId && existing.assigneeId !== userId) {
        await this.notifyAssignee(
          existing.assigneeId,
          'TASK_PRIORITY_CHANGED',
          'Task priority updated',
          `"${task.title}" priority changed to ${updateTaskDto.priority.replace('_', ' ')}`,
          task.id,
        );
      }
    }

    this.notificationsGateway.emitTaskUpdate(existing.projectId, task);

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

    if (task.assigneeId && task.assigneeId !== userId) {
      await this.notifyAssignee(
        task.assigneeId,
        'TASK_DELETED',
        'Task deleted',
        `"${task.title}" was deleted`,
        id,
      );
    }

    this.notificationsGateway.emitTaskDeleted(task.projectId, {
      id: task.id,
    });

    return { message: 'Task deleted successfully' };
  }

  async bulkReorder(
    projectId: string,
    tasks: { taskId: string; status: TaskStatus; order: number }[],
    userId: string,
  ) {
    await this.assertMember(projectId, userId);

    const taskIds = tasks.map((t) => t.taskId);
    const found = await this.prisma.task.findMany({
      where: { id: { in: taskIds }, projectId },
      select: { id: true },
    });

    if (found.length !== taskIds.length) {
      throw new BadRequestException('Some tasks not found in this project');
    }

    const updates = tasks.map((t) =>
      this.prisma.task.update({
        where: { id: t.taskId },
        data: { status: t.status, order: t.order },
      }),
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

  private async assertAssigneesAreMembers(
    projectId: string,
    assigneeId?: string | null,
  ) {
    if (!assigneeId) return;

    const assignee = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId: assigneeId, projectId },
      },
    });

    if (!assignee) {
      throw new BadRequestException(
        'Assignee must be a member of this project',
      );
    }
  }

  private async assertLabelsBelongToProject(
    projectId: string,
    labelIds?: string[],
  ) {
    if (!labelIds || labelIds.length === 0) return;

    const labels = await this.prisma.label.findMany({
      where: { id: { in: labelIds }, projectId },
      select: { id: true },
    });

    if (labels.length !== labelIds.length) {
      throw new BadRequestException(
        'One or more labels do not belong to this project',
      );
    }
  }

  private async notifyAssignee(
    assigneeId: string,
    type: string,
    title: string,
    message: string,
    entityId: string,
  ) {
    const notification = await this.notificationsService.create(assigneeId, {
      type,
      title,
      message,
      entityId,
      entityType: 'Task',
    });

    this.notificationsGateway.emitNotification(assigneeId, notification);
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
        ...(data.metadata
          ? { metadata: data.metadata as unknown as Record<string, string> }
          : {}),
      },
    });
  }
}
