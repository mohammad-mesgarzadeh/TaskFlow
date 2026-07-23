import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchTasksDto } from './dto/search.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('tasks')
  @ApiOperation({ summary: 'Search tasks across all projects' })
  async searchTasks(
    @CurrentUser('id') userId: string,
    @Query() filters: SearchTasksDto,
  ) {
    return this.searchService.searchTasks(userId, filters);
  }
}
