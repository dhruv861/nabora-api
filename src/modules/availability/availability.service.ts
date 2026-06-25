import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertAvailabilityDto, GetAvailabilityQueryDto } from './dto/availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDateMidnightUTC(dateStr: string): Date {
    // Parse YYYY-MM-DD → midnight UTC
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr))
      throw new BadRequestException('Date must be in YYYY-MM-DD format');
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    if (isNaN(d.getTime())) throw new BadRequestException('Invalid date');
    return d;
  }

  /** POST/PATCH /users/me/availability — upsert a single date slot */
  async upsert(userId: string, dto: UpsertAvailabilityDto) {
    const date = this.parseDateMidnightUTC(dto.date);
    return this.prisma.availabilitySlot.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, isAvailable: dto.isAvailable },
      update: { isAvailable: dto.isAvailable },
    });
  }

  /** GET /users/me/availability?from=&to= */
  async getMine(userId: string, query: GetAvailabilityQueryDto) {
    const from = query.from ? this.parseDateMidnightUTC(query.from) : new Date();
    const toDefault = new Date(from);
    toDefault.setUTCDate(toDefault.getUTCDate() + 30);
    const to = query.to ? this.parseDateMidnightUTC(query.to) : toDefault;

    const slots = await this.prisma.availabilitySlot.findMany({
      where: { userId, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
      select: { date: true, isAvailable: true },
    });

    // Return as a map: date string → isAvailable (client fills gaps as true)
    return slots.map((s) => ({
      date: s.date.toISOString().split('T')[0],
      isAvailable: s.isAvailable,
    }));
  }

  /** GET /users/:id/availability?from=&to= — public */
  async getPublic(userId: string, query: GetAvailabilityQueryDto) {
    return this.getMine(userId, query);
  }

  /** DELETE /users/me/availability/:date — reset to default (available) */
  async deleteSlot(userId: string, dateStr: string) {
    const date = this.parseDateMidnightUTC(dateStr);
    await this.prisma.availabilitySlot.deleteMany({ where: { userId, date } });
    return { deleted: true, date: dateStr };
  }

  /** Filter worker IDs available on a specific date (used by browseWorkers) */
  async getUnavailableUserIds(date: Date): Promise<string[]> {
    const slots = await this.prisma.availabilitySlot.findMany({
      where: { date, isAvailable: false },
      select: { userId: true },
    });
    return slots.map((s) => s.userId);
  }
}
