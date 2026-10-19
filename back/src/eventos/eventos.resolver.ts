import { Resolver, Subscription, Args, ID } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { Pedido } from '../pedidos/pedido.model.js';
import { ActualizacionEstadisticas } from './actualizacion-estadisticas.model.js';
import { Rol } from '../usuarios/usuarios.model.js';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserAuthContext } from '../auth/types/auth.types.js';
import { PUB_SUB, TOPIC_ESTADISTICAS, topicPedidosDeUsuario } from './eventos.constants.js';

@Resolver()
export class EventosResolver {
  constructor(@Inject(PUB_SUB) private readonly pubSub: PubSub) {}

  // Sin argumento escucha todos mis pedidos; con pedidoId, solo ese
  @Subscription(() => Pedido, {
    filter: (payload, variables) =>
      !variables?.pedidoId || payload.miPedidoActualizado.id === variables.pedidoId,
  })
  @UseGuards(GqlAuthGuard)
  miPedidoActualizado(
    @Args('pedidoId', { type: () => ID, nullable: true }) _pedidoId: string | undefined,
    @CurrentUser() user: UserAuthContext,
  ) {
    // La seguridad esta en el canal: solo se escucha el del usuario autenticado
    return this.pubSub.asyncIterableIterator(topicPedidosDeUsuario(user.userId));
  }

  @Subscription(() => ActualizacionEstadisticas)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  estadisticasActualizadas() {
    return this.pubSub.asyncIterableIterator(TOPIC_ESTADISTICAS);
  }
}