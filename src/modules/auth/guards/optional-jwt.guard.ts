import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * Optional JWT guard — attaches req.user if a valid token is present,
 * but does NOT reject the request if no token is provided.
 * Used for public endpoints that benefit from knowing the caller's identity
 * (e.g., job detail page needs to know if the user has already applied).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  // Override handleRequest so a missing/invalid token is silently ignored
  handleRequest<T>(_err: unknown, user: T): T {
    return user; // user will be undefined/null if not authenticated — that's OK
  }
}
