import { Resolver, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PagosService } from './pagos.service.js';
import { PagoIniciado } from './pago.model.js';
import { Pedido } from '../pedidos/pedido.model.js';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserAuthContext } from '../auth/types/auth.types.js';

@Resolver()
export class PagosResolver {
  constructor(private readonly pagosService: PagosService) {}

  @Mutation(() => PagoIniciado)
  @UseGuards(GqlAuthGuard)
  iniciarPago(
    @Args('pedidoId', { type: () => ID }) pedidoId: string,
    @Args('proveedor') proveedor: string,
    @CurrentUser() user: UserAuthContext,
  ) {
    return this.pagosService.iniciarPago(pedidoId, proveedor, user);
  }

  @Mutation(() => Pedido)
  @UseGuards(GqlAuthGuard)
  confirmarPago(
    @Args('pedidoId', { type: () => ID }) pedidoId: string,
    @CurrentUser() user: UserAuthContext,
  ) {
    return this.pagosService.confirmar(pedidoId, user);
  }
}