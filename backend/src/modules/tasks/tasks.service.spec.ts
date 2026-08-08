import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { TasksService } from './tasks.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PrismaService } from '../../prisma/prisma.service';

describe('TasksService', () => {
  let service: TasksService;

  const prisma = {
    projectMember: { findUnique: jest.fn() },
    task: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    label: { findMany: jest.fn() },
    activity: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const notificationsService = {
    create: jest.fn(),
  };

  const notificationsGateway = {
    emitNotification: jest.fn(),
    emitTaskCreated: jest.fn(),
    emitTaskUpdate: jest.fn(),
    emitTaskDeleted: jest.fn(),
  };

  const member = {
    id: 'm-1',
    userId: 'user-1',
    projectId: 'project-1',
    role: 'MEMBER',
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TasksService(
      prisma as unknown as PrismaService,
      notificationsService as unknown as NotificationsService,
      notificationsGateway as unknown as NotificationsGateway,
    );
  });

  it('throws ForbiddenException when creating a task as a non-member', async () => {
    prisma.projectMember.findUnique.mockResolvedValue(null);

    await expect(
      service.create('project-1', { title: 'New task' }, 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws BadRequestException when assignee is not a project member', async () => {
    prisma.projectMember.findUnique
      .mockResolvedValueOnce(member)
      .mockResolvedValueOnce(null);

    await expect(
      service.create(
        'project-1',
        { title: 'Task', assigneeId: 'outsider' },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when a label does not belong to the project', async () => {
    prisma.projectMember.findUnique.mockResolvedValue(member);
    prisma.label.findMany.mockResolvedValue([{ id: 'label-1' }]);

    await expect(
      service.create(
        'project-1',
        { title: 'Task', labelIds: ['label-1', 'label-2'] },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a task, notifies the assignee and emits task:created', async () => {
    prisma.projectMember.findUnique.mockResolvedValue(member);
    prisma.task.aggregate.mockResolvedValue({ _max: { order: null } });
    const created = { id: 'task-1', title: 'Task', projectId: 'project-1' };
    prisma.task.create.mockResolvedValue(created);
    prisma.activity.create.mockResolvedValue(undefined);
    const notification = { id: 'notif-1' };
    notificationsService.create.mockResolvedValue(notification);

    const result = await service.create(
      'project-1',
      { title: 'Task', assigneeId: 'assignee-1' },
      'user-1',
    );

    expect(result).toEqual(created);
    expect(notificationsService.create).toHaveBeenCalledWith(
      'assignee-1',
      expect.objectContaining({ type: 'TASK_ASSIGNED' }),
    );
    expect(notificationsGateway.emitNotification).toHaveBeenCalledWith(
      'assignee-1',
      notification,
    );
    expect(notificationsGateway.emitTaskCreated).toHaveBeenCalledWith(
      'project-1',
      created,
    );
  });

  it('does not notify when assigning the task to yourself', async () => {
    prisma.projectMember.findUnique.mockResolvedValue(member);
    prisma.task.aggregate.mockResolvedValue({ _max: { order: null } });
    prisma.task.create.mockResolvedValue({ id: 'task-1', title: 'Task' });
    prisma.activity.create.mockResolvedValue(undefined);

    await service.create(
      'project-1',
      { title: 'Task', assigneeId: 'user-1' },
      'user-1',
    );

    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when updating a task as a non-member', async () => {
    prisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      status: TaskStatus.TODO,
    });
    prisma.projectMember.findUnique.mockResolvedValue(null);

    await expect(
      service.update('task-1', { title: 'Updated' }, 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws BadRequestException when updating assignee to a non-member', async () => {
    prisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      status: TaskStatus.TODO,
      assigneeId: null,
    });
    prisma.projectMember.findUnique
      .mockResolvedValueOnce(member)
      .mockResolvedValueOnce(null);

    await expect(
      service.update('task-1', { assigneeId: 'outsider' }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when attaching a foreign label on update', async () => {
    prisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      status: TaskStatus.TODO,
      assigneeId: null,
      labels: [],
    });
    prisma.projectMember.findUnique.mockResolvedValue(member);
    prisma.label.findMany.mockResolvedValue([]);

    await expect(
      service.update('task-1', { labelIds: ['label-x'] }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('notifies the current assignee on status change and emits task:update', async () => {
    const existing = {
      id: 'task-1',
      projectId: 'project-1',
      title: 'Task',
      status: TaskStatus.TODO,
      priority: 'MEDIUM',
      type: 'TASK',
      assigneeId: 'assignee-1',
    };
    prisma.task.findUnique.mockResolvedValue(existing);
    prisma.projectMember.findUnique.mockResolvedValue(member);
    prisma.task.aggregate.mockResolvedValue({ _max: { order: 3 } });
    const updated = { ...existing, status: TaskStatus.IN_PROGRESS };
    prisma.task.update.mockResolvedValue(updated);
    prisma.activity.create.mockResolvedValue(undefined);
    const notification = { id: 'notif-1' };
    notificationsService.create.mockResolvedValue(notification);

    const result = await service.update(
      'task-1',
      { status: TaskStatus.IN_PROGRESS },
      'user-1',
    );

    expect(result).toEqual(updated);
    expect(notificationsService.create).toHaveBeenCalledWith(
      'assignee-1',
      expect.objectContaining({ type: 'TASK_STATUS_CHANGED' }),
    );
    expect(notificationsGateway.emitNotification).toHaveBeenCalledWith(
      'assignee-1',
      notification,
    );
    expect(notificationsGateway.emitTaskUpdate).toHaveBeenCalledWith(
      'project-1',
      updated,
    );
  });

  it('throws ForbiddenException when listing tasks as a non-member', async () => {
    prisma.projectMember.findUnique.mockResolvedValue(null);

    await expect(service.findAll('project-1', 'user-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when deleting a task as a non-member', async () => {
    prisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
    });
    prisma.projectMember.findUnique.mockResolvedValue(null);

    await expect(service.remove('task-1', 'user-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException on bulk reorder as a non-member', async () => {
    prisma.projectMember.findUnique.mockResolvedValue(null);

    await expect(
      service.bulkReorder(
        'project-1',
        [{ taskId: 'task-1', status: TaskStatus.IN_PROGRESS, order: 0 }],
        'user-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws BadRequestException when reordering tasks outside the project', async () => {
    prisma.projectMember.findUnique.mockResolvedValue(member);
    prisma.task.findMany.mockResolvedValue([{ id: 'task-1' }]);

    await expect(
      service.bulkReorder(
        'project-1',
        [
          { taskId: 'task-1', status: TaskStatus.IN_PROGRESS, order: 0 },
          { taskId: 'task-2', status: TaskStatus.DONE, order: 1 },
        ],
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
