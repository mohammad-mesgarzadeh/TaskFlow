import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Activities')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller()
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('tasks/:taskId/activities')
  @ApiOperation({ summary: 'Get activity log for a task' })
  async findByTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.activitiesService.findByTask(taskId, userId);
  }

  @Get('projects/:projectId/activities')
  @ApiOperation({ summary: 'Get activity log for a project' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @CurrentUser('id') userId: string,
  ) {
    return this.activitiesService.findByProject(projectId, userId, limit);
  }
}
