import { Resolver, Query, Mutation, Args, ResolveField, Parent, ID } from '@nestjs/graphql';
import { Pedido } from './pedido.model.js';
import { Usuario } from '../usuarios/usuarios.model.js';
import { PedidosService } from './pedidos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ItemPedidoInput } from './dto/item-pedido.input.js';

@Resolver(() => Pedido)
export class PedidosResolver {
  constructor(
    private readonly pedidosService: PedidosService,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => [Pedido])
  pedidos() {
    return this.pedidosService.findAll();
  }

  @Mutation(() => Pedido)
  crearPedido(
    @Args('items', { type: () => [ItemPedidoInput] }) items: ItemPedidoInput[],
    @Args('usuarioId', { type: () => ID, nullable: true }) usuarioId?: string,
  ) {
    return this.pedidosService.crearPedido(items, usuarioId);
  }

  @ResolveField(() => Usuario, { nullable: true })
  usuario(@Parent() pedido: Pedido) {
    return this.prisma.usuario.findUnique({ where: { id: pedido.usuarioId } });
  }
}