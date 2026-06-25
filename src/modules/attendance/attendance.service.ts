import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CheckInDto, CheckOutDto, OverrideAttendanceDto } from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── POST /v1/hires/:id/attendance/check-in ──────────────────────────────
  async checkIn(hireId: string, workerId: string, dto: CheckInDto) {
    const hire = await this.prisma.hire.findUnique({
      where: { id: hireId },
      include: {
        job: { select: { id: true, title: true, locationLat: true, locationLng: true, posterId: true } },
        worker: { select: { id: true, name: true } },
      },
    });
    if (!hire) throw new NotFoundException('Hire not found');
    if (hire.workerId !== workerId) throw new ForbiddenException('Only the worker can check in');
    if (hire.status !== 'ACTIVE') throw new ConflictException('Hire is not active');

    // GPS distance validation using PostGIS ST_Distance
    const [distResult] = await this.prisma.$queryRaw<{ distance_meters: number }[]>`
      SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${hire.job.locationLng}, ${hire.job.locationLat}), 4326)::geography
      ) AS distance_meters
    `;

    const distMeters = distResult?.distance_meters ?? 0;
    if (distMeters > 500) {
      const distKm = (distMeters / 1000).toFixed(2);
      throw new BadRequestException(
        `You are ${distKm}km from the job location. Must be within 500m to check in.`,
      );
    }

    // Today's date (UTC, date only)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

    // Idempotency guard
    const existing = await this.prisma.attendance.findFirst({
      where: {
        hireId,
        workDate: { gte: today, lt: tomorrow },
      },
    });
    if (existing) {
      throw new ConflictException(
        existing.status === 'CHECKED_OUT'
          ? 'You have already checked in and out today'
          : 'You have already checked in today',
      );
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        hireId,
        workDate: today,
        checkInTime: new Date(),
        checkInLat: dto.lat,
        checkInLng: dto.lng,
        checkInSelfieUrl: dto.selfieUrl,
        status: 'CHECKED_IN',
      },
    });

    // Notify employer / coordinator
    this.notifications
      .notify(
        hire.job.posterId,
        'ATTENDANCE_REMINDER',
        'Worker Checked In',
        `${hire.worker.name ?? 'A worker'} has checked in for ${hire.job.title}`,
        { hireId, attendanceId: attendance.id },
      )
      .catch(() => {});

    return attendance;
  }

  // ── POST /v1/hires/:id/attendance/check-out ────────────────────────────
  async checkOut(hireId: string, workerId: string, dto: CheckOutDto) {
    const hire = await this.prisma.hire.findUnique({
      where: { id: hireId },
      select: { id: true, workerId: true, status: true },
    });
    if (!hire) throw new NotFoundException('Hire not found');
    if (hire.workerId !== workerId) throw new ForbiddenException('Only the worker can check out');
    if (hire.status !== 'ACTIVE') throw new ConflictException('Hire is not active');

    // Find today's check-in
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        hireId,
        workDate: { gte: today, lt: tomorrow },
        status: 'CHECKED_IN',
      },
    });
    if (!attendance) throw new BadRequestException('No active check-in found for today');
    if (!attendance.checkInTime) throw new BadRequestException('Check-in time is missing');

    const checkOutTime = new Date();
    const totalHours = +(
      (checkOutTime.getTime() - attendance.checkInTime.getTime()) / 3_600_000
    ).toFixed(2);

    return this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime,
        checkOutLat: dto.lat,
        checkOutLng: dto.lng,
        totalHours,
        status: 'CHECKED_OUT',
      },
    });
  }

  // ── GET /v1/hires/:id/attendance ───────────────────────────────────
  async getAttendance(hireId: string, userId: string) {
    const hire = await this.prisma.hire.findUnique({ where: { id: hireId } });
    if (!hire) throw new NotFoundException('Hire not found');
    if (hire.workerId !== userId && hire.employerId !== userId)
      throw new ForbiddenException('Access denied');

    return this.prisma.attendance.findMany({
      where: { hireId },
      orderBy: { workDate: 'asc' },
    });
  }

  // ── PATCH /v1/hires/:id/attendance/:attendanceId ─────────────────────
  async overrideAttendance(
    hireId: string,
    attendanceId: string,
    callerId: string,
    dto: OverrideAttendanceDto,
  ) {
    const hire = await this.prisma.hire.findUnique({
      where: { id: hireId },
      select: { id: true, workerId: true, employerId: true, job: { select: { organizationId: true } } },
    });
    if (!hire) throw new NotFoundException('Hire not found');

    // Must be employer or org member
    const isEmployer = hire.employerId === callerId;
    let isOrgMember = false;
    if (!isEmployer && hire.job.organizationId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: { organizationId: hire.job.organizationId, userId: callerId, isActive: true },
      });
      isOrgMember = !!member;
    }
    if (!isEmployer && !isOrgMember)
      throw new ForbiddenException('Only the employer or a field coordinator can override attendance');

    const attendance = await this.prisma.attendance.findUnique({ where: { id: attendanceId } });
    if (!attendance || attendance.hireId !== hireId)
      throw new NotFoundException('Attendance record not found');

    const now = new Date();
    let totalHours = attendance.totalHours;

    // Auto-compute hours when marking CHECKED_OUT with a missing checkout time
    if (dto.status === 'CHECKED_OUT' && !attendance.checkOutTime && attendance.checkInTime) {
      totalHours = +((now.getTime() - attendance.checkInTime.getTime()) / 3_600_000).toFixed(2);
    }

    return this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status: dto.status,
        markedByUserId: callerId,
        ...(dto.status === 'CHECKED_OUT' && !attendance.checkOutTime
          ? { checkOutTime: now, totalHours }
          : {}),
      },
    });
  }

  // ── GET /v1/events/:id/attendance ──────────────────────────────────
  async getEventAttendance(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        roles: {
          include: {
            jobs: { select: { id: true } },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Event not found');

    // Auth: org member
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: event.organizationId, userId, isActive: true },
    });
    if (!member) throw new ForbiddenException('You are not a member of this organization');

    // Today boundaries
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

    const roleGroups = await Promise.all(
      event.roles.map(async (role) => {
        const jobId = role.jobs[0]?.id;
        if (!jobId) return { role, workers: [] };

        const hires = await this.prisma.hire.findMany({
          where: { jobId, status: { not: 'CANCELLED' } },
          include: {
            worker: { select: { id: true, name: true, avatarUrl: true, phone: true } },
            attendance: {
              where: { workDate: { gte: today, lt: tomorrow } },
              take: 1,
            },
          },
        });

        const workers = hires.map((h) => ({
          hireId: h.id,
          worker: h.worker,
          attendance: h.attendance[0] ?? null,
        }));

        return { role: { id: role.id, title: role.title }, workers };
      }),
    );

    // Summary stats
    const allWorkers = roleGroups.flatMap((rg) => rg.workers);
    const summary = {
      total: allWorkers.length,
      checkedIn: allWorkers.filter((w) => w.attendance?.status === 'CHECKED_IN').length,
      checkedOut: allWorkers.filter((w) => w.attendance?.status === 'CHECKED_OUT').length,
      absent: allWorkers.filter((w) => w.attendance?.status === 'ABSENT' || !w.attendance).length,
    };

    return { roleGroups, summary };
  }
}
