import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkillsService } from './skills.service';
import { AddUserSkillsDto } from './dto/skills.dto';

@ApiTags('skills')
@Controller()
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get('skills')
  @ApiOperation({ summary: 'List all active skills (cached 1h)' })
  @ApiQuery({ name: 'category', required: false })
  findAll(@Query('category') category?: string) {
    return this.skillsService.findAll(category);
  }

  @Post('users/me/skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add skills to own worker profile' })
  addSkills(
    @Request() req: { user: { id: string } },
    @Body() dto: AddUserSkillsDto,
  ) {
    return this.skillsService.addUserSkills(req.user.id, dto);
  }

  @Delete('users/me/skills/:skillId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a skill from own worker profile' })
  removeSkill(
    @Request() req: { user: { id: string } },
    @Param('skillId') skillId: string,
  ) {
    return this.skillsService.removeUserSkill(req.user.id, skillId);
  }
}
