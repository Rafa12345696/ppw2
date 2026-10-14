import { Module } from '@nestjs/common';
import { PedidosService } from './pedidos.service.js';
import { PedidosResolver } from './pedidos.resolver.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  providers: [PedidosService, PedidosResolver],
})
export class PedidosModule {}