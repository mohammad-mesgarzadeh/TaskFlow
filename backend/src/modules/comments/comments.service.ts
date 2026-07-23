import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(taskId: string, createCommentDto: CreateCommentDto, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.assertMember(task.projectId, userId);

    const comment = await this.prisma.comment.create({
      data: {
        content: createCommentDto.content,
        taskId,
        authorId: userId,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await this.prisma.activity.create({
      data: {
        action: 'COMMENT_ADDED',
        entityType: 'Comment',
        entityId: comment.id,
        taskId,
        userId,
        metadata: { content: comment.content.substring(0, 100) },
      },
    });

    return comment;
  }

  async findAll(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.assertMember(task.projectId, userId);

    return this.prisma.comment.findMany({
      where: { taskId },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, updateCommentDto: UpdateCommentDto, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { task: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.prisma.comment.update({
      where: { id },
      data: { content: updateCommentDto.content },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        task: true,
        author: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId, projectId: comment.task.projectId },
      },
    });

    const isAuthor = comment.authorId === userId;
    const isAdmin = member?.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({ where: { id } });

    return { message: 'Comment deleted successfully' };
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
  }
}
