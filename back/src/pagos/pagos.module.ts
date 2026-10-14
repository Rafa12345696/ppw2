import { Module } from '@nestjs/common';
import { PagosService } from './pagos.service.js';
import { PagosResolver } from './pagos.resolver.js';
import { WebhooksController } from './webhooks.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [WebhooksController],
  providers: [PagosService, PagosResolver],
})
export class PagosModule {}