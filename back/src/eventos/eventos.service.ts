import { Inject, Injectable, Logger } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PrismaService } from '../prisma/prisma.service.js';
import { PUB_SUB, TOPIC_ESTADISTICAS, topicPedidosDeUsuario } from './eventos.constants.js';

@Injectable()
export class EventosService {
  private readonly logger = new Logger(EventosService.name);

  constructor(
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
    private readonly prisma: PrismaService,
  ) {}

  // Se llama despues de cualquier cambio de un pedido: avisa a su dueño y al panel de estadisticas
  async pedidoCambio(pedidoId: string) {
    try {
      const pedido = await this.prisma.pedido.findUnique({ where: { id: pedidoId } });
      if (!pedido) return;

      await this.pubSub.publish(topicPedidosDeUsuario(pedido.usuarioId), {
        miPedidoActualizado: pedido,
      });
      await this.estadisticasCambio('pedido', pedido.id);
    } catch (e) {
      this.logger.error(`No se pudo publicar el evento del pedido ${pedidoId}: ${(e as Error).message}`);
    }
  }

  async estadisticasCambio(motivo: string, referencia?: string) {
    await this.pubSub.publish(TOPIC_ESTADISTICAS, {
      estadisticasActualizadas: { motivo, referencia: referencia ?? null, fecha: new Date() },
    });
  }
}