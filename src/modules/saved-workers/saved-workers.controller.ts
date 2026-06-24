import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SavedWorkersService } from './saved-workers.service';

@ApiTags('saved-workers')
@Controller('users/me/saved-workers')
export class SavedWorkersController {
  constructor(private readonly savedWorkersService: SavedWorkersService) {}

  @Post(':workerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save a worker' })
  save(
    @Request() req: { user: { id: string } },
    @Param('workerId') workerId: string,
  ) {
    return this.savedWorkersService.save(req.user.id, workerId);
  }

  @Delete(':workerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsave a worker' })
  unsave(
    @Request() req: { user: { id: string } },
    @Param('workerId') workerId: string,
  ) {
    return this.savedWorkersService.unsave(req.user.id, workerId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated saved workers with profile summary' })
  list(
    @Request() req: { user: { id: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.savedWorkersService.list(req.user.id, Number(page ?? 1), Number(limit ?? 20));
  }
}
