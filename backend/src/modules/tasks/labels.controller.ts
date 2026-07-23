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
import { LabelsService } from './labels.service';
import { CreateLabelDto, UpdateLabelDto } from './dto/label.dto';

@ApiTags('Labels')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('projects/:projectId/labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new label' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createLabelDto: CreateLabelDto,
  ) {
    return this.labelsService.create(projectId, createLabelDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all labels for a project' })
  async findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.labelsService.findAll(projectId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a label' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLabelDto: UpdateLabelDto,
  ) {
    return this.labelsService.update(id, updateLabelDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a label' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.labelsService.remove(id);
  }
}
