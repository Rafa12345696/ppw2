import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventosService } from '../eventos/eventos.service.js';
import { ItemPedidoInput } from './dto/item-pedido.input.js';
import { ESTADO_PEDIDO, MINUTOS_RESERVA } from './pedido.constants.js';
import { Rol } from '../usuarios/usuarios.model.js';
import type { UserAuthContext } from '../auth/types/auth.types.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;

// Un pedido pagado solo avanza un paso a la vez
const SIGUIENTE_ENVIO: Record<string, string> = {
  POR_PREPARAR: 'PREPARANDO',
  PREPARANDO: 'ENVIADO',
  ENVIADO: 'ENTREGADO',
};

@Injectable()
export class PedidosService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PedidosService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private prisma: PrismaService,
    private eventos: EventosService,
  ) {}

  onModuleInit() {
    const barrer = () =>
      this.expirarVencidos().catch((e: Error) =>
        this.logger.error(`No se pudieron expirar pedidos: ${e.message}`),
      );
    barrer();
    this.timer = setInterval(barrer, 60_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  findAll() {
    return this.prisma.pedido.findMany({ orderBy: { fecha: 'desc' } });
  }

  findByUsuario(usuarioId: string) {
    return this.prisma.pedido.findMany({
      where: { usuarioId },
      orderBy: { fecha: 'desc' },
    });
  }

  async findOneDe(id: string, user: UserAuthContext) {
    if (!OBJECT_ID.test(id)) throw new NotFoundException('Pedido no encontrado');

    const pedido = await this.prisma.pedido.findUnique({ where: { id } });
    if (!pedido || (user.rol !== Rol.ADMIN && pedido.usuarioId !== user.userId)) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return pedido;
  }

  async crearPedido(items: ItemPedidoInput[], usuarioId: string) {
    if (items.length === 0) {
      throw new BadRequestException('El pedido no tiene productos');
    }

    // Libera primero el stock de pedidos vencidos
    await this.expirarVencidos();

    const cantidades = new Map<string, number>();
    for (const item of items) {
      if (item.cantidad < 1) throw new BadRequestException('Cantidad invalida');
      if (!OBJECT_ID.test(item.productoId)) throw new BadRequestException('Producto invalido');
      cantidades.set(item.productoId, (cantidades.get(item.productoId) ?? 0) + item.cantidad);
    }

    const pedido = await this.prisma.$transaction(async (tx) => {
      const detalles: { productoId: string; nombre: string; cantidad: number; precioUnit: number }[] = [];
      let total = 0;

      for (const [productoId, cantidad] of cantidades) {
        const producto = await tx.producto.findUnique({ where: { id: productoId } });
        if (!producto) {
          throw new BadRequestException('Un producto del carrito ya no existe');
        }

        // Reserva el stock solo si alcanza
        const actualizado = await tx.producto.updateMany({
          where: { id: producto.id, stock: { gte: cantidad } },
          data: { stock: { decrement: cantidad } },
        });
        if (actualizado.count === 0) {
          throw new BadRequestException(
            `Stock insuficiente de ${producto.nombre} (quedan ${producto.stock})`,
          );
        }

        detalles.push({
          productoId: producto.id,
          nombre: producto.nombre,
          cantidad,
          precioUnit: producto.precio,
        });
        total += producto.precio * cantidad;
      }

      return tx.pedido.create({
        data: {
          total: Math.round(total * 100) / 100,
          usuarioId,
          detalles,
          estado: ESTADO_PEDIDO.PENDIENTE_PAGO,
          expiraEn: new Date(Date.now() + MINUTOS_RESERVA * 60_000),
        },
      });
    });

    await this.eventos.pedidoCambio(pedido.id);
    return pedido;
  }

  // Cancela un pedido que sigue pendiente y devuelve su stock. Si ya cambio de estado, no hace nada.
  async liberar(pedidoId: string, nuevoEstado: string) {
    const liberado = await this.prisma.$transaction(async (tx) => {
      const reclamado = await tx.pedido.updateMany({
        where: { id: pedidoId, estado: ESTADO_PEDIDO.PENDIENTE_PAGO },
        data: { estado: nuevoEstado },
      });
      if (reclamado.count === 0) return false;

      const pedido = await tx.pedido.findUnique({ where: { id: pedidoId } });
      for (const d of pedido?.detalles ?? []) {
        await tx.producto.updateMany({
          where: { id: d.productoId },
          data: { stock: { increment: d.cantidad } },
        });
      }
      return true;
    });

    if (liberado) await this.eventos.pedidoCambio(pedidoId);
    return liberado;
  }

  async expirarVencidos() {
    const vencidos = await this.prisma.pedido.findMany({
      where: { estado: ESTADO_PEDIDO.PENDIENTE_PAGO, expiraEn: { lt: new Date() } },
      select: { id: true },
    });
    for (const p of vencidos) {
      await this.liberar(p.id, ESTADO_PEDIDO.EXPIRADO);
    }
    return vencidos.length;
  }

  async cambiarEnvio(pedidoId: string, envio: string) {
    if (!OBJECT_ID.test(pedidoId)) throw new NotFoundException('Pedido no encontrado');

    const pedido = await this.prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');

    if (pedido.estado !== ESTADO_PEDIDO.PAGADO) {
      throw new BadRequestException('Solo se puede dar seguimiento de envio a pedidos pagados');
    }

    const actual = pedido.envio ?? 'POR_PREPARAR';
    const permitido = SIGUIENTE_ENVIO[actual];
    if (!permitido || permitido !== envio) {
      throw new BadRequestException(
        permitido
          ? `Desde ${actual} el siguiente estado debe ser ${permitido}`
          : 'Este pedido ya fue entregado',
      );
    }

    const actualizado = await this.prisma.pedido.update({
      where: { id: pedidoId },
      data: { envio, envioActualizadoEn: new Date() },
    });

    await this.eventos.pedidoCambio(pedidoId);
    return actualizado;
  }
}