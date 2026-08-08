import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLabelDto, UpdateLabelDto } from './dto/label.dto';

@Injectable()
export class LabelsService {
  constructor(private prisma: PrismaService) {}

  async create(
    projectId: string,
    createLabelDto: CreateLabelDto,
    userId: string,
  ) {
    await this.assertMember(projectId, userId);

    const existing = await this.prisma.label.findFirst({
      where: {
        name: createLabelDto.name,
        projectId,
      },
    });

    if (existing) {
      throw new ConflictException('Label with this name already exists');
    }

    return this.prisma.label.create({
      data: {
        name: createLabelDto.name,
        color: createLabelDto.color,
        projectId,
      },
    });
  }

  async findAll(projectId: string, userId: string) {
    await this.assertMember(projectId, userId);

    return this.prisma.label.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, updateLabelDto: UpdateLabelDto, userId: string) {
    const label = await this.prisma.label.findUnique({ where: { id } });

    if (!label) {
      throw new NotFoundException('Label not found');
    }

    await this.assertMember(label.projectId, userId);

    return this.prisma.label.update({
      where: { id },
      data: updateLabelDto,
    });
  }

  async remove(id: string, userId: string) {
    const label = await this.prisma.label.findUnique({ where: { id } });

    if (!label) {
      throw new NotFoundException('Label not found');
    }

    await this.assertMember(label.projectId, userId);

    await this.prisma.label.delete({ where: { id } });

    return { message: 'Label deleted successfully' };
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
}
