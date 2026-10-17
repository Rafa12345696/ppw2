import { Resolver, Mutation, Query, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PagosService } from './pagos.service.js';
import { PagoIniciado, PagoRegistro, ConfigPagos, ResultadoPagoMP } from './pago.model.js';
import { Pedido } from '../pedidos/pedido.model.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Rol } from '../usuarios/usuarios.model.js';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserAuthContext } from '../auth/types/auth.types.js';

@Resolver()
export class PagosResolver {
  constructor(
    private readonly pagosService: PagosService,
    private readonly prisma: PrismaService,
  ) {}

  // Claves publicas (seguras de exponer) para que el frontend arme los formularios
  @Query(() => ConfigPagos)
  configPagos() {
    return this.pagosService.configPagos();
  }

  @Mutation(() => ResultadoPagoMP)
  @UseGuards(GqlAuthGuard)
  pagarConMercadoPago(
    @Args('pedidoId', { type: () => ID }) pedidoId: string,
    @Args('datos') datos: string,
    @CurrentUser() user: UserAuthContext,
  ) {
    return this.pagosService.pagarConMercadoPago(pedidoId, datos, user);
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard)
  crearOrdenPayPal(
    @Args('pedidoId', { type: () => ID }) pedidoId: string,
    @CurrentUser() user: UserAuthContext,
  ) {
    return this.pagosService.crearOrdenPayPalEmbebida(pedidoId, user);
  }

  @Mutation(() => Pedido)
  @UseGuards(GqlAuthGuard)
  capturarPayPal(
    @Args('pedidoId', { type: () => ID }) pedidoId: string,
    @Args('orderId') orderId: string,
    @CurrentUser() user: UserAuthContext,
  ) {
    return this.pagosService.capturarPayPal(pedidoId, orderId, user);
  }

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

  @Query(() => [PagoRegistro])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  pagos() {
    return this.prisma.pago.findMany({ orderBy: { creadoEn: 'desc' }, take: 200 });
  }
}