import { Logger } from '../utils/logger';

export class HealthCheckService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('HealthCheckService');
  }

  start(): void {
    this.logger.info('Health check service started');
  }
}
