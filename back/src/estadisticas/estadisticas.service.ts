import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ESTADO_PEDIDO } from '../pedidos/pedido.constants.js';

const ZONA = 'America/Mexico_City';
const DIA_MS = 86_400_000;

const claveDia = (fecha: Date) => fecha.toLocaleDateString('en-CA', { timeZone: ZONA });
const redondear = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class EstadisticasService {
  constructor(private prisma: PrismaService) {}

  async obtener(diasPedidos: number) {
    const dias = Math.min(Math.max(Math.floor(diasPedidos) || 30, 1), 365);

    // Un casillero por dia, para que la grafica no tenga huecos
    const porDia = new Map<string, { total: number; pedidos: number }>();
    for (let i = dias - 1; i >= 0; i--) {
      porDia.set(claveDia(new Date(Date.now() - i * DIA_MS)), { total: 0, pedidos: 0 });
    }

    const pagados = await this.prisma.pedido.findMany({
      where: {
        estado: ESTADO_PEDIDO.PAGADO,
        pagadoEn: { gte: new Date(Date.now() - (dias + 1) * DIA_MS) },
      },
    });

    const productos = new Map<string, { nombre: string; unidades: number; ingresos: number }>();
    const metodos = new Map<string, { total: number; pedidos: number }>();
    let ingresos = 0;
    let cantidad = 0;

    for (const p of pagados) {
      if (!p.pagadoEn) continue;
      const celda = porDia.get(claveDia(p.pagadoEn));
      if (!celda) continue;

      celda.total += p.total;
      celda.pedidos += 1;
      ingresos += p.total;
      cantidad += 1;

      const metodo = p.metodoPago ?? 'DESCONOCIDO';
      const m = metodos.get(metodo) ?? { total: 0, pedidos: 0 };
      m.total += p.total;
      m.pedidos += 1;
      metodos.set(metodo, m);

      for (const d of p.detalles) {
        const prod = productos.get(d.productoId) ?? { nombre: d.nombre, unidades: 0, ingresos: 0 };
        prod.unidades += d.cantidad;
        prod.ingresos += d.cantidad * d.precioUnit;
        productos.set(d.productoId, prod);
      }
    }

    const todos = await this.prisma.pedido.findMany({ select: { estado: true } });
    const estados = new Map<string, number>();
    for (const p of todos) estados.set(p.estado, (estados.get(p.estado) ?? 0) + 1);

    const stockBajo = await this.prisma.producto.findMany({
      where: { stock: { lte: 5 } },
      orderBy: { stock: 'asc' },
      take: 10,
    });

    return {
      ingresosTotales: redondear(ingresos),
      pedidosPagados: cantidad,
      ticketPromedio: cantidad > 0 ? redondear(ingresos / cantidad) : 0,
      pedidosPendientes: estados.get(ESTADO_PEDIDO.PENDIENTE_PAGO) ?? 0,
      ventasPorDia: [...porDia.entries()].map(([fecha, v]) => ({
        fecha,
        total: redondear(v.total),
        pedidos: v.pedidos,
      })),
      topProductos: [...productos.values()]
        .sort((a, b) => b.unidades - a.unidades)
        .slice(0, 5)
        .map((p) => ({ ...p, ingresos: redondear(p.ingresos) })),
      ventasPorMetodo: [...metodos.entries()].map(([metodo, v]) => ({
        metodo,
        total: redondear(v.total),
        pedidos: v.pedidos,
      })),
      pedidosPorEstado: [...estados.entries()].map(([estado, cant]) => ({ estado, cantidad: cant })),
      stockBajo: stockBajo.map((p) => ({ id: p.id, nombre: p.nombre, stock: p.stock })),
    };
  }
}