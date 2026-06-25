import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { OrgRole } from '../types/enums';

/**
 * RolesGuard — RBAC for organization-scoped endpoints.
 *
 * Usage: Apply AFTER JwtAuthGuard.
 * Reads orgId from route param `:id` or `:orgId`.
 * Checks caller's OrganizationMember.role against @Roles(...) decorator.
 *
 * Role hierarchy (highest → lowest):
 *   OWNER > OPERATIONS_MANAGER > EVENT_MANAGER > FIELD_COORDINATOR > FINANCE_MANAGER
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private static readonly HIERARCHY: Record<OrgRole, number> = {
    [OrgRole.OWNER]:               5,
    [OrgRole.OPERATIONS_MANAGER]:  4,
    [OrgRole.EVENT_MANAGER]:       3,
    [OrgRole.FIELD_COORDINATOR]:   2,
    [OrgRole.FINANCE_MANAGER]:     2,
  };

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrgRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator — allow through
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.id;
    if (!userId) throw new ForbiddenException('Authentication required');

    // Support both :id and :orgId route params
    const orgId: string | undefined =
      request.params?.orgId ?? request.params?.id;
    if (!orgId) throw new ForbiddenException('Organization ID not found in route params');

    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId, isActive: true },
      select: { role: true },
    });

    if (!member) throw new ForbiddenException('You are not a member of this organization');

    const callerLevel = RolesGuard.HIERARCHY[member.role as OrgRole] ?? 0;
    const minRequired = Math.min(
      ...requiredRoles.map((r) => RolesGuard.HIERARCHY[r] ?? 99),
    );

    if (callerLevel < minRequired) {
      throw new ForbiddenException(`Required role: ${requiredRoles.join(' or ')}`);
    }

    // Attach member info to request for use in service if needed
    request.orgMember = { role: member.role, orgId };
    return true;
  }
}
