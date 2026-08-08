import { ForbiddenException } from '@nestjs/common';
import { ProjectRole } from '@prisma/client';
import { CommentsService } from './comments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PrismaService } from '../../prisma/prisma.service';

describe('CommentsService', () => {
  let service: CommentsService;

  const prisma = {
    task: { findUnique: jest.fn() },
    projectMember: { findUnique: jest.fn() },
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    activity: { create: jest.fn() },
  };

  const notificationsService = {
    create: jest.fn(),
  };

  const notificationsGateway = {
    emitNotification: jest.fn(),
  };

  const member = {
    id: 'm-1',
    userId: 'user-1',
    projectId: 'project-1',
    role: ProjectRole.MEMBER,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommentsService(
      prisma as unknown as PrismaService,
      notificationsService as unknown as NotificationsService,
      notificationsGateway as unknown as NotificationsGateway,
    );
  });

  it('throws ForbiddenException when editing someone elses comment', async () => {
    prisma.comment.findUnique.mockResolvedValue({
      id: 'c-1',
      authorId: 'other-user',
      task: { projectId: 'project-1' },
    });

    await expect(
      service.update('c-1', { content: 'updated' }, 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when the author is no longer a project member', async () => {
    prisma.comment.findUnique.mockResolvedValue({
      id: 'c-1',
      authorId: 'user-1',
      task: { projectId: 'project-1' },
    });
    prisma.projectMember.findUnique.mockResolvedValue(null);

    await expect(
      service.update('c-1', { content: 'updated' }, 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows the author to update their comment when still a member', async () => {
    const comment = {
      id: 'c-1',
      authorId: 'user-1',
      content: 'updated',
      task: { projectId: 'project-1' },
    };
    prisma.comment.findUnique.mockResolvedValue(comment);
    prisma.projectMember.findUnique.mockResolvedValue(member);
    prisma.comment.update.mockResolvedValue(comment);

    const result = await service.update(
      'c-1',
      { content: 'updated' },
      'user-1',
    );

    expect(result).toEqual(comment);
  });

  it('notifies the assignee when a comment is added', async () => {
    prisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      assigneeId: 'assignee-1',
      title: 'Task',
    });
    prisma.projectMember.findUnique.mockResolvedValue(member);
    const comment = { id: 'c-1', content: 'hello' };
    prisma.comment.create.mockResolvedValue(comment);
    prisma.activity.create.mockResolvedValue(undefined);
    const notification = { id: 'notif-1' };
    notificationsService.create.mockResolvedValue(notification);

    const result = await service.create(
      'task-1',
      { content: 'hello' },
      'user-1',
    );

    expect(result).toEqual(comment);
    expect(notificationsService.create).toHaveBeenCalledWith(
      'assignee-1',
      expect.objectContaining({ type: 'COMMENT_ADDED' }),
    );
    expect(notificationsGateway.emitNotification).toHaveBeenCalledWith(
      'assignee-1',
      notification,
    );
  });

  it('does not notify when commenting on your own assigned task', async () => {
    prisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      assigneeId: 'user-1',
      title: 'Task',
    });
    prisma.projectMember.findUnique.mockResolvedValue(member);
    prisma.comment.create.mockResolvedValue({ id: 'c-1', content: 'hello' });
    prisma.activity.create.mockResolvedValue(undefined);

    await service.create('task-1', { content: 'hello' }, 'user-1');

    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when a non-author member deletes a comment', async () => {
    prisma.comment.findUnique.mockResolvedValue({
      id: 'c-1',
      authorId: 'other-user',
      task: { projectId: 'project-1' },
    });
    prisma.projectMember.findUnique.mockResolvedValue(member);

    await expect(service.remove('c-1', 'user-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows the author to delete their own comment', async () => {
    prisma.comment.findUnique.mockResolvedValue({
      id: 'c-1',
      authorId: 'user-1',
      task: { projectId: 'project-1' },
    });
    prisma.projectMember.findUnique.mockResolvedValue(member);
    prisma.comment.delete.mockResolvedValue({ id: 'c-1' });

    const result = await service.remove('c-1', 'user-1');

    expect(result).toEqual({ message: 'Comment deleted successfully' });
  });
});
