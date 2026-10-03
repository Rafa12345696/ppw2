import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ItemPedidoInput } from './dto/item-pedido.input.js';

@Injectable()
export class PedidosService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.pedido.findMany();
  }

  async crearPedido(items: ItemPedidoInput[], usuarioId?: string) {
    const total = items.reduce((acc, item) => acc + item.cantidad * item.precioUnit, 0);

    let uid = usuarioId;
    if (!uid) {
      const usuarioDemo = await this.prisma.usuario.findFirst();
      if (!usuarioDemo) {
        throw new Error('No hay ningun usuario en la base de datos. Corre el seed primero.');
      }
      uid = usuarioDemo.id;
    }

    return this.prisma.pedido.create({
      data: {
        total,
        usuarioId: uid,
        detalles: items,
      },
    });
  }
}