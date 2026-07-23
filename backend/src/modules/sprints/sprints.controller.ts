import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SprintsService } from './sprints.service';
import { CreateSprintDto, UpdateSprintDto, AssignTasksDto } from './dto/sprint.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sprints')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('projects/:projectId/sprints')
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sprint' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateSprintDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.sprintsService.create(projectId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sprints for a project' })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.sprintsService.findAll(projectId, userId);
  }

  @Get(':sprintId')
  @ApiOperation({ summary: 'Get sprint by ID with tasks' })
  async findOne(
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.sprintsService.findOne(sprintId, userId);
  }

  @Put(':sprintId')
  @ApiOperation({ summary: 'Update a sprint' })
  async update(
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Body() dto: UpdateSprintDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.sprintsService.update(sprintId, dto, userId);
  }

  @Delete(':sprintId')
  @ApiOperation({ summary: 'Delete a sprint' })
  async remove(
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.sprintsService.remove(sprintId, userId);
  }

  @Put(':sprintId/activate')
  @ApiOperation({ summary: 'Activate a sprint (deactivates others)' })
  async activate(
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.sprintsService.activate(sprintId, userId);
  }

  @Post(':sprintId/tasks')
  @ApiOperation({ summary: 'Assign tasks to a sprint' })
  async assignTasks(
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Body() dto: AssignTasksDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.sprintsService.assignTasks(sprintId, dto.taskIds, userId);
  }

  @Delete(':sprintId/tasks')
  @ApiOperation({ summary: 'Remove tasks from a sprint' })
  async removeTasks(
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Body() dto: AssignTasksDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.sprintsService.removeTasks(sprintId, dto.taskIds, userId);
  }
}
