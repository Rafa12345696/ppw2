import { Module } from '@nestjs/common';
import { BackofficeService } from './backoffice.service.js';
import { BackofficeResolver } from './backoffice.resolver.js';

@Module({
  providers: [BackofficeService, BackofficeResolver],
})
export class BackofficeModule {}