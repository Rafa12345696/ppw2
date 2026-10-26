import { Inject, Injectable, Logger } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  PUB_SUB,
  TOPIC_ESTADISTICAS,
  TOPIC_PRODUCTOS,
  topicPedidosDeUsuario,
} from './eventos.constants.js';

type Accion = 'CREADO' | 'ACTUALIZADO' | 'ELIMINADO';

@Injectable()
export class EventosService {
  private readonly logger = new Logger(EventosService.name);

  constructor(
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
    private readonly prisma: PrismaService,
  ) {}

  // Se llama despues de cualquier cambio de un pedido: avisa a su dueño, al panel y al catalogo
  async pedidoCambio(pedidoId: string) {
    try {
      const pedido = await this.prisma.pedido.findUnique({ where: { id: pedidoId } });
      if (!pedido) return;

      await this.pubSub.publish(topicPedidosDeUsuario(pedido.usuarioId), {
        miPedidoActualizado: pedido,
      });
      await this.estadisticasCambio('pedido', pedido.id);
      await this.productosCambiaron(pedido.detalles.map((d) => d.productoId));
    } catch (e) {
      this.logger.error(`No se pudo publicar el evento del pedido ${pedidoId}: ${(e as Error).message}`);
    }
  }

  async estadisticasCambio(motivo: string, referencia?: string) {
    await this.pubSub.publish(TOPIC_ESTADISTICAS, {
      estadisticasActualizadas: { motivo, referencia: referencia ?? null, fecha: new Date() },
    });
  }

  async productoCambio(accion: Accion, producto: { id: string; categoriaId: string }) {
    await this.pubSub.publish(TOPIC_PRODUCTOS, {
      productoCambio: {
        accion,
        productoId: producto.id,
        categoriaId: producto.categoriaId,
        producto: accion === 'ELIMINADO' ? null : producto,
      },
    });
  }

  // El stock cambia al comprar, expirar, cancelar o reactivar un pedido
  private async productosCambiaron(ids: string[]) {
    const unicos = [...new Set(ids)];
    if (unicos.length === 0) return;

    const productos = await this.prisma.producto.findMany({ where: { id: { in: unicos } } });
    for (const p of productos) {
      await this.productoCambio('ACTUALIZADO', p);
    }
  }
}