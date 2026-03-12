import { Logger } from '../utils/logger';

export class JobQueueService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('JobQueueService');
  }

  async initialize(): Promise<void> {
    this.logger.info('Job queue service initialized');
  }
}
