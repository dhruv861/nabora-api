import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Wraps all non-null controller return values in the standard Nabora response envelope.
 * { success: true, data: {...} }
 *
 * Null/undefined responses (e.g. from DELETE handlers) are returned as-is.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data: T) => {
        if (data === null || data === undefined) {
          return data as unknown as SuccessResponse<T>;
        }
        return { success: true as const, data };
      }),
    );
  }
}
