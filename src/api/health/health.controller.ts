import { AllConfigType } from '@/config/config.type';
import { ApiPublic } from '@/decorators/http.decorators';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private configService: ConfigService<AllConfigType>,
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
  ) {}

  // @Public()
  @ApiOperation({ summary: 'Health check' })
  @Get()
  @ApiPublic()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const list = [
      () =>
        this.http.pingCheck(
          'api-docs',
          `${this.configService.get('app.url', { infer: true })}/api-docs`,
        ),
    ];
    return this.health.check(list);
  }
}
