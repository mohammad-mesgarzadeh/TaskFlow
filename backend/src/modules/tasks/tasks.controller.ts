import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, BulkReorderDto } from './dto/task.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.create(projectId, createTaskDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks for a project' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.findAll(projectId, userId);
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get task by ID' })
  async findOne(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.findOne(taskId, userId);
  }

  @Put(':taskId')
  @ApiOperation({ summary: 'Update a task' })
  async update(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.update(taskId, updateTaskDto, userId);
  }

  @Delete(':taskId')
  @ApiOperation({ summary: 'Delete a task' })
  async remove(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.remove(taskId, userId);
  }

  @Put('reorder/bulk')
  @ApiOperation({ summary: 'Bulk reorder tasks' })
  async bulkReorder(
    @Body() bulkReorderDto: BulkReorderDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.bulkReorder(bulkReorderDto.tasks, userId);
  }
}
