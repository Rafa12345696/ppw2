import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards, BadRequestException } from '@nestjs/common';
import { Pedido } from './pedido.model.js';
import { Usuario, Rol } from '../usuarios/usuarios.model.js';
import { PagoRegistro } from '../pagos/pago.model.js';
import { PedidosService } from './pedidos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ItemPedidoInput } from './dto/item-pedido.input.js';
import { ESTADO_PEDIDO } from './pedido.constants.js';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserAuthContext } from '../auth/types/auth.types.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;

@Resolver(() => Pedido)
export class PedidosResolver {
  constructor(
    private readonly pedidosService: PedidosService,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => [Pedido])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  pedidos() {
    return this.pedidosService.findAll();
  }

  @Query(() => [Pedido])
  @UseGuards(GqlAuthGuard)
  misPedidos(@CurrentUser() user: UserAuthContext) {
    return this.pedidosService.findByUsuario(user.userId);
  }

  @Query(() => Pedido)
  @UseGuards(GqlAuthGuard)
  miPedido(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: UserAuthContext,
  ) {
    return this.pedidosService.findOneDe(id, user);
  }

  @Mutation(() => Pedido)
  @UseGuards(GqlAuthGuard)
  crearPedido(
    @Args('items', { type: () => [ItemPedidoInput] }) items: ItemPedidoInput[],
    @CurrentUser() user: UserAuthContext,
  ) {
    return this.pedidosService.crearPedido(items, user.userId);
  }

  @Mutation(() => Pedido)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  async cancelarPedido(@Args('id', { type: () => ID }) id: string) {
    if (!OBJECT_ID.test(id)) throw new BadRequestException('Pedido no valido');

    const cancelado = await this.pedidosService.liberar(id, ESTADO_PEDIDO.CANCELADO);
    if (!cancelado) {
      throw new BadRequestException('Solo se pueden cancelar pedidos pendientes de pago');
    }
    return this.prisma.pedido.findUniqueOrThrow({ where: { id } });
  }

  @ResolveField(() => Usuario, { nullable: true })
  usuario(@Parent() pedido: Pedido) {
    return this.prisma.usuario.findUnique({ where: { id: pedido.usuarioId } });
  }

  @ResolveField(() => [PagoRegistro])
  pagos(@Parent() pedido: Pedido) {
    return this.prisma.pago.findMany({
      where: { pedidoId: pedido.id },
      orderBy: { creadoEn: 'desc' },
    });
  }
}