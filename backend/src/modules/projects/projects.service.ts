import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ProjectRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: string) {
    const project = await this.prisma.project.create({
      data: {
        ...createProjectDto,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: ProjectRole.ADMIN,
          },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return project;
  }

  async findAll(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects;
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isMember = project.members.some((member) => member.userId === userId);

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const member = project.members[0];
    if (!member || member.role !== ProjectRole.ADMIN) {
      throw new ForbiddenException(
        'Only project admins can update the project',
      );
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const member = project.members[0];
    if (!member || member.role !== ProjectRole.ADMIN) {
      throw new ForbiddenException(
        'Only project admins can delete the project',
      );
    }

    await this.prisma.project.delete({ where: { id } });

    return { message: 'Project deleted successfully' };
  }

  async addMember(
    projectId: string,
    addMemberDto: AddMemberDto,
    userId: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const requester = project.members[0];
    if (!requester || requester.role !== ProjectRole.ADMIN) {
      throw new ForbiddenException('Only project admins can add members');
    }

    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: addMemberDto.userId,
          projectId,
        },
      },
    });

    if (existingMember) {
      throw new ForbiddenException('User is already a member of this project');
    }

    const member = await this.prisma.projectMember.create({
      data: {
        userId: addMemberDto.userId,
        projectId,
        role: addMemberDto.role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (addMemberDto.userId !== userId) {
      const notification = await this.notificationsService.create(
        addMemberDto.userId,
        {
          type: 'PROJECT_ADDED',
          title: 'Added to project',
          message: `You have been added to "${project.name}" as ${addMemberDto.role}`,
          entityId: projectId,
          entityType: 'Project',
        },
      );
      this.notificationsGateway.emitNotification(
        addMemberDto.userId,
        notification,
      );
    }

    return member;
  }

  async removeMember(projectId: string, memberId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const requester = project.members[0];
    if (!requester || requester.role !== ProjectRole.ADMIN) {
      throw new ForbiddenException('Only project admins can remove members');
    }

    if (memberId === userId) {
      throw new ForbiddenException('Cannot remove yourself from the project');
    }

    await this.prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId: memberId,
          projectId,
        },
      },
    });

    return { message: 'Member removed successfully' };
  }

  async updateMemberRole(
    projectId: string,
    memberId: string,
    role: ProjectRole,
    userId: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const requester = project.members[0];
    if (!requester || requester.role !== ProjectRole.ADMIN) {
      throw new ForbiddenException(
        'Only project admins can update member roles',
      );
    }

    const member = await this.prisma.projectMember.update({
      where: {
        userId_projectId: {
          userId: memberId,
          projectId,
        },
      },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return member;
  }
}
