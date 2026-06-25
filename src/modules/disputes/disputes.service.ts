import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDisputeDto, AddEvidenceDto, ResolveDisputeDto } from './dto/disputes.dto';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(hireId: string, raiserId: string, dto: CreateDisputeDto) {
    const hire = await this.prisma.hire.findUnique({
      where: { id: hireId },
      include: {
        job: { select: { title: true } },
        worker: { select: { id: true, name: true } },
        employer: { select: { id: true, name: true } },
      },
    });
    if (!hire) throw new NotFoundException('Hire not found');
    if (hire.workerId !== raiserId && hire.employerId !== raiserId)
      throw new ForbiddenException('Only the worker or employer can raise a dispute');
    if (!['ACTIVE', 'COMPLETED'].includes(hire.status))
      throw new ConflictException(`Cannot raise a dispute on a hire with status: ${hire.status}`);

    const existing = await this.prisma.dispute.findUnique({ where: { hireId } });
    if (existing) throw new ConflictException('A dispute already exists for this hire');

    const [dispute] = await this.prisma.$transaction([
      this.prisma.dispute.create({
        data: { hireId, raisedById: raiserId, type: dto.type, description: dto.description },
        include: { raisedBy: { select: { name: true } }, evidence: true },
      }),
      this.prisma.hire.update({ where: { id: hireId }, data: { status: 'DISPUTED' } }),
    ]);

    // Notify the other party
    const otherId = raiserId === hire.workerId ? hire.employerId : hire.workerId;
    const raiserName = raiserId === hire.workerId ? hire.worker.name : hire.employer.name;
    this.notifications.notify(
      otherId,
      'DISPUTE_OPENED',
      'Dispute Raised',
      `${raiserName ?? 'A party'} raised a dispute on hire: ${hire.job.title}`,
      { hireId, disputeId: dispute.id },
    ).catch(() => {});

    // Notify all admins
    const admins = await this.prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } });
    for (const admin of admins) {
      this.notifications.notify(
        admin.id,
        'DISPUTE_OPENED',
        'New Dispute Requires Review',
        `Dispute raised on hire: ${hire.job.title} (${dto.type.replace(/_/g, ' ')})`,
        { hireId, disputeId: dispute.id },
      ).catch(() => {});
    }

    return dispute;
  }

  async addEvidence(disputeId: string, uploaderId: string, dto: AddEvidenceDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { hire: { select: { workerId: true, employerId: true } } },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.hire.workerId !== uploaderId && dispute.hire.employerId !== uploaderId)
      throw new ForbiddenException('Only the parties to the dispute can add evidence');

    await this.prisma.disputeEvidence.create({
      data: {
        disputeId,
        uploadedById: uploaderId,
        fileUrl: dto.fileUrl,
        fileType: dto.fileType,
        description: dto.description,
      },
    });

    return this.findOne(disputeId, uploaderId);
  }

  async findOne(disputeId: string, userId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        raisedBy: { select: { id: true, name: true, avatarUrl: true } },
        evidence: { orderBy: { createdAt: 'asc' } },
        hire: {
          select: {
            id: true, status: true, workerId: true, employerId: true,
            job: { select: { title: true } },
            worker: { select: { id: true, name: true, avatarUrl: true } },
            employer: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    const isAdmin = await this.prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
    if (!isAdmin?.isAdmin && dispute.hire.workerId !== userId && dispute.hire.employerId !== userId)
      throw new ForbiddenException('Access denied');
    return dispute;
  }

  async findByHire(hireId: string, userId: string) {
    const hire = await this.prisma.hire.findUnique({ where: { id: hireId } });
    if (!hire) throw new NotFoundException('Hire not found');
    if (hire.workerId !== userId && hire.employerId !== userId)
      throw new ForbiddenException('Access denied');
    return this.prisma.dispute.findUnique({
      where: { hireId },
      include: { evidence: true, raisedBy: { select: { name: true } } },
    });
  }

  async resolve(disputeId: string, adminId: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { hire: { select: { workerId: true, employerId: true, status: true, job: { select: { title: true } } } } },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: dto.status,
        resolution: dto.resolution,
        resolvedAt: ['RESOLVED', 'REJECTED'].includes(dto.status) ? new Date() : undefined,
        resolvedById: ['RESOLVED', 'REJECTED'].includes(dto.status) ? adminId : undefined,
      },
    });

    // If resolved and hire is still DISPUTED, flip back to COMPLETED
    if (dto.status === 'RESOLVED' && dispute.hire.status === 'DISPUTED') {
      await this.prisma.hire.update({ where: { id: dispute.hireId }, data: { status: 'COMPLETED' } });
    }

    // Notify both parties
    const msg = dto.status === 'RESOLVED'
      ? `Your dispute for "${dispute.hire.job.title}" has been resolved.`
      : dto.status === 'REJECTED'
      ? `Your dispute for "${dispute.hire.job.title}" was not upheld.`
      : `Your dispute for "${dispute.hire.job.title}" is now under review.`;

    for (const userId of [dispute.hire.workerId, dispute.hire.employerId]) {
      this.notifications.notify(userId, 'DISPUTE_RESOLVED', 'Dispute Update', msg, { disputeId }).catch(() => {});
    }

    return updated;
  }
}
