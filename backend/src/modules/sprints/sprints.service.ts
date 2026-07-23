import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSprintDto, UpdateSprintDto } from './dto/sprint.dto';

@Injectable()
export class SprintsService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, dto: CreateSprintDto, userId: string) {
    await this.assertMember(projectId, userId);

    const sprint = await this.prisma.sprint.create({
      data: {
        name: dto.name,
        goal: dto.goal,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        projectId,
      },
      include: {
        _count: { select: { tasks: true } },
      },
    });

    return sprint;
  }

  async findAll(projectId: string, userId: string) {
    await this.assertMember(projectId, userId);

    return this.prisma.sprint.findMany({
      where: { projectId },
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            labels: { include: { label: true } },
            _count: { select: { comments: true } },
          },
          orderBy: [{ status: 'asc' }, { order: 'asc' }],
        },
        _count: { select: { tasks: true } },
      },
    });

    if (!sprint) throw new NotFoundException('Sprint not found');

    await this.assertMember(sprint.projectId, userId);

    return sprint;
  }

  async update(id: string, dto: UpdateSprintDto, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id } });
    if (!sprint) throw new NotFoundException('Sprint not found');

    await this.assertMember(sprint.projectId, userId);

    return this.prisma.sprint.update({
      where: { id },
      data: {
        name: dto.name,
        goal: dto.goal,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isActive: dto.isActive,
      },
      include: {
        _count: { select: { tasks: true } },
      },
    });
  }

  async remove(id: string, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id } });
    if (!sprint) throw new NotFoundException('Sprint not found');

    await this.assertMember(sprint.projectId, userId);

    await this.prisma.task.updateMany({
      where: { sprintId: id },
      data: { sprintId: null },
    });

    await this.prisma.sprint.delete({ where: { id } });

    return { message: 'Sprint deleted successfully' };
  }

  async activate(id: string, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id } });
    if (!sprint) throw new NotFoundException('Sprint not found');

    await this.assertAdmin(sprint.projectId, userId);

    await this.prisma.sprint.updateMany({
      where: { projectId: sprint.projectId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.sprint.update({
      where: { id },
      data: { isActive: true },
      include: { _count: { select: { tasks: true } } },
    });
  }

  async assignTasks(id: string, taskIds: string[], userId: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id } });
    if (!sprint) throw new NotFoundException('Sprint not found');

    await this.assertMember(sprint.projectId, userId);

    const tasks = await this.prisma.task.findMany({
      where: { id: { in: taskIds }, projectId: sprint.projectId },
    });

    if (tasks.length !== taskIds.length) {
      throw new BadRequestException('Some tasks not found in this project');
    }

    await this.prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: { sprintId: id },
    });

    return this.findOne(id, userId);
  }

  async removeTasks(id: string, taskIds: string[], userId: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id } });
    if (!sprint) throw new NotFoundException('Sprint not found');

    await this.assertMember(sprint.projectId, userId);

    await this.prisma.task.updateMany({
      where: { id: { in: taskIds }, sprintId: id },
      data: { sprintId: null },
    });

    return this.findOne(id, userId);
  }

  private async assertMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (!member) throw new ForbiddenException('You are not a member of this project');
    return member;
  }

  private async assertAdmin(projectId: string, userId: string) {
    const member = await this.assertMember(projectId, userId);
    if (member.role !== 'ADMIN') {
      throw new ForbiddenException('Only project admins can perform this action');
    }
    return member;
  }
}
