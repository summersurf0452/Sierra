import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { Request, Response } from 'express';
import { throwError } from 'rxjs';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(
    @Optional() @Inject(MetricsService)
    private readonly metricsService?: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const method = req.method;
    const url = req.originalUrl;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - now;
        const purple = '\x1b[35m';
        const reset = '\x1b[0m';
        this.logger.log(`${purple}[${method}] ${url} : ${ms}ms${reset}`);
        this.metricsService?.recordRequest(url, method, res.statusCode, ms);
      }),
      catchError((error) => {
        const ms = Date.now() - now;
        const statusCode = error.status || error.statusCode || 500;
        this.metricsService?.recordRequest(url, method, statusCode, ms);
        return throwError(() => error);
      }),
    );
  }
}
