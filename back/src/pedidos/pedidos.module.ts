import { Module } from '@nestjs/common';
import { PedidosService } from './pedidos.service.js';
import { PedidosResolver } from './pedidos.resolver.js';

@Module({
  providers: [PedidosService, PedidosResolver],
})
export class PedidosModule {}