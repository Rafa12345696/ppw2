import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Pedido } from './pedido.model.js';
import { Usuario, Rol } from '../usuarios/usuarios.model.js';
import { PedidosService } from './pedidos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ItemPedidoInput } from './dto/item-pedido.input.js';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserAuthContext } from '../auth/types/auth.types.js';

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

  @ResolveField(() => Usuario, { nullable: true })
  usuario(@Parent() pedido: Pedido) {
    return this.prisma.usuario.findUnique({ where: { id: pedido.usuarioId } });
  }
}