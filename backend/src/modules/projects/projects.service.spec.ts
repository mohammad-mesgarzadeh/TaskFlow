import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectRole } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const prisma = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  };

  const notificationsService = {
    create: jest.fn(),
  };

  const notificationsGateway = {
    emitNotification: jest.fn(),
  };

  const adminMember = {
    id: 'm-1',
    userId: 'user-1',
    projectId: 'project-1',
    role: ProjectRole.ADMIN,
    createdAt: new Date(),
  };

  const member = {
    id: 'm-2',
    userId: 'user-2',
    projectId: 'project-1',
    role: ProjectRole.MEMBER,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(
      prisma as unknown as PrismaService,
      notificationsService as unknown as NotificationsService,
      notificationsGateway as unknown as NotificationsGateway,
    );
  });

  it('throws ForbiddenException when a non-admin tries to update a project', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      members: [member],
    });

    await expect(
      service.update('project-1', { name: 'Renamed' }, 'user-2'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when the project does not exist on update', async () => {
    prisma.project.findUnique.mockResolvedValue(null);

    await expect(
      service.update('missing', { name: 'Renamed' }, 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when a non-admin tries to add a member', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      members: [member],
    });

    await expect(
      service.addMember(
        'project-1',
        { userId: 'user-3', role: ProjectRole.MEMBER },
        'user-2',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when a non-admin tries to remove a member', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      members: [member],
    });

    await expect(
      service.removeMember('project-1', 'user-3', 'user-2'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('notifies the new member when an admin adds them', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      name: 'Project One',
      members: [adminMember],
    });
    prisma.projectMember.findUnique.mockResolvedValue(null);
    const created = {
      id: 'm-3',
      userId: 'user-3',
      projectId: 'project-1',
      role: ProjectRole.MEMBER,
    };
    prisma.projectMember.create.mockResolvedValue(created);
    const notification = { id: 'notif-1' };
    notificationsService.create.mockResolvedValue(notification);

    const result = await service.addMember(
      'project-1',
      { userId: 'user-3', role: ProjectRole.MEMBER },
      'user-1',
    );

    expect(result).toEqual(created);
    expect(notificationsService.create).toHaveBeenCalledWith(
      'user-3',
      expect.objectContaining({ type: 'PROJECT_ADDED' }),
    );
    expect(notificationsGateway.emitNotification).toHaveBeenCalledWith(
      'user-3',
      notification,
    );
  });

  it('does not notify when adding yourself to a project', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      name: 'Project One',
      members: [adminMember],
    });
    prisma.projectMember.findUnique.mockResolvedValue(null);
    prisma.projectMember.create.mockResolvedValue({ id: 'm-3' });

    await service.addMember(
      'project-1',
      { userId: 'user-1', role: ProjectRole.ADMIN },
      'user-1',
    );

    expect(notificationsService.create).not.toHaveBeenCalled();
  });
});
