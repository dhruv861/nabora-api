import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * AdminGuard — checks request.user.isAdmin === true.
 * Must be used AFTER JwtAuthGuard.
 * isAdmin is read from the DB in JwtStrategy.validate() — no extra DB hit.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
