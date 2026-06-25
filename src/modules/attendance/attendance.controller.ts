import {
  Controller, Post, Get, Patch, Body, Param, UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto, OverrideAttendanceDto } from './dto/attendance.dto';

@ApiTags('attendance')
@Controller()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('hires/:id/attendance/check-in')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'GPS check-in with selfie (worker only, must be within 500m)' })
  checkIn(
    @Param('id') hireId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: CheckInDto,
  ) {
    return this.attendanceService.checkIn(hireId, req.user.id, dto);
  }

  @Post('hires/:id/attendance/check-out')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GPS check-out with totalHours calculation (worker only)' })
  checkOut(
    @Param('id') hireId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: CheckOutDto,
  ) {
    return this.attendanceService.checkOut(hireId, req.user.id, dto);
  }

  @Get('hires/:id/attendance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full attendance log for a hire (worker or employer)' })
  getAttendance(
    @Param('id') hireId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.attendanceService.getAttendance(hireId, req.user.id);
  }

  @Patch('hires/:id/attendance/:attendanceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Override attendance status (employer or field coordinator)' })
  overrideAttendance(
    @Param('id') hireId: string,
    @Param('attendanceId') attendanceId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: OverrideAttendanceDto,
  ) {
    return this.attendanceService.overrideAttendance(hireId, attendanceId, req.user.id, dto);
  }

  @Get('events/:id/attendance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get attendance dashboard for an event (org member)' })
  getEventAttendance(
    @Param('id') eventId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.attendanceService.getEventAttendance(eventId, req.user.id);
  }
}
