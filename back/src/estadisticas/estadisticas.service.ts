import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ESTADO_PEDIDO } from '../pedidos/pedido.constants.js';

const ZONA = 'America/Mexico_City';
const DIA_MS = 86_400_000;
const DIAS_SEMANA = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ETIQUETAS_DIA = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

const formatoHora = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  hourCycle: 'h23',
  timeZone: ZONA,
});

const claveDia = (fecha: Date) => fecha.toLocaleDateString('en-CA', { timeZone: ZONA });
const diaSemana = (fecha: Date) =>
  fecha.toLocaleDateString('en-US', { weekday: 'short', timeZone: ZONA });
const redondear = (n: number) => Math.round(n * 100) / 100;

// Claves de dia (YYYY-MM-DD) desde "hace N dias" hasta "hace M dias", ambos incluidos
function clavesDias(desdeHace: number, hastaHace: number) {
  const claves: string[] = [];
  for (let i = desdeHace; i >= hastaHace; i--) {
    claves.push(claveDia(new Date(Date.now() - i * DIA_MS)));
  }
  return claves;
}

type Celda = { total: number; pedidos: number };

@Injectable()
export class EstadisticasService {
  constructor(private prisma: PrismaService) {}

  async obtener(diasPedidos: number) {
    const dias = Math.min(Math.max(Math.floor(diasPedidos) || 30, 1), 365);
    const actuales = clavesDias(dias - 1, 0);
    const setActual = new Set(actuales);
    const anteriores = new Set(clavesDias(dias * 2 - 1, dias));
    const desde = new Date(Date.now() - (dias * 2 + 1) * DIA_MS);

    const [pedidos, todos, productosDB, categoriasDB, usuariosDB] = await Promise.all([
      this.prisma.pedido.findMany({
        where: { OR: [{ fecha: { gte: desde } }, { pagadoEn: { gte: desde } }] },
      }),
      this.prisma.pedido.findMany({ select: { estado: true } }),
      this.prisma.producto.findMany({
        select: { id: true, nombre: true, stock: true, categoriaId: true },
      }),
      this.prisma.categoria.findMany({ select: { id: true, nombre: true } }),
      this.prisma.usuario.findMany({
        where: { createdAt: { gte: new Date(Date.now() - (dias + 1) * DIA_MS) } },
        select: { createdAt: true },
      }),
    ]);

    // Un casillero por dia, para que las graficas no tengan huecos
    const porDia = new Map<string, Celda>();
    const usuariosPorDia = new Map<string, number>();
    for (const c of actuales) {
      porDia.set(c, { total: 0, pedidos: 0 });
      usuariosPorDia.set(c, 0);
    }

    let usuariosNuevos = 0;
    for (const u of usuariosDB) {
      const c = claveDia(u.createdAt);
      if (usuariosPorDia.has(c)) {
        usuariosPorDia.set(c, (usuariosPorDia.get(c) ?? 0) + 1);
        usuariosNuevos += 1;
      }
    }

    const nombreCategoria = new Map<string, string>();
    for (const c of categoriasDB) nombreCategoria.set(c.id, c.nombre);
    const categoriaDeProducto = new Map<string, string>();
    for (const p of productosDB) {
      categoriaDeProducto.set(p.id, nombreCategoria.get(p.categoriaId) ?? 'Sin categoria');
    }

    let ingresos = 0;
    let cantidad = 0;
    let ingresosAnterior = 0;
    let pedidosAnterior = 0;
    let creados = 0;
    let creadosPagados = 0;

    const metodos = new Map<string, Celda>();
    const vendidos = new Map<string, { nombre: string; unidades: number; ingresos: number }>();
    const categorias = new Map<string, { total: number; unidades: number }>();
    const semana = new Map<string, Celda>();
    const horas: number[] = new Array(24).fill(0);
    const clientes = new Map<string, { pedidos: number; total: number }>();
    const pares = new Map<string, number>();
    const nombres = new Map<string, string>();

    for (const p of pedidos) {
      if (setActual.has(claveDia(p.fecha))) {
        creados += 1;
        if (p.estado === ESTADO_PEDIDO.PAGADO) creadosPagados += 1;
      }

      if (p.estado !== ESTADO_PEDIDO.PAGADO || !p.pagadoEn) continue;
      const clave = claveDia(p.pagadoEn);

      if (anteriores.has(clave)) {
        ingresosAnterior += p.total;
        pedidosAnterior += 1;
        continue;
      }

      const celda = porDia.get(clave);
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

      const diaClave = diaSemana(p.pagadoEn);
      const s = semana.get(diaClave) ?? { total: 0, pedidos: 0 };
      s.total += p.total;
      s.pedidos += 1;
      semana.set(diaClave, s);

      const hora = Number(formatoHora.format(p.pagadoEn));
      if (Number.isInteger(hora) && hora >= 0 && hora < 24) horas[hora] += 1;

      const cliente = clientes.get(p.usuarioId) ?? { pedidos: 0, total: 0 };
      cliente.pedidos += 1;
      cliente.total += p.total;
      clientes.set(p.usuarioId, cliente);

      for (const d of p.detalles) {
        nombres.set(d.productoId, d.nombre);

        const prod = vendidos.get(d.productoId) ?? { nombre: d.nombre, unidades: 0, ingresos: 0 };
        prod.unidades += d.cantidad;
        prod.ingresos += d.cantidad * d.precioUnit;
        vendidos.set(d.productoId, prod);

        const nombreCat = categoriaDeProducto.get(d.productoId) ?? 'Sin categoria';
        const cat = categorias.get(nombreCat) ?? { total: 0, unidades: 0 };
        cat.total += d.cantidad * d.precioUnit;
        cat.unidades += d.cantidad;
        categorias.set(nombreCat, cat);
      }

      // Pares de productos que aparecen juntos en el mismo pedido
      const ids = [...new Set(p.detalles.map((d) => d.productoId))].sort();
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const par = `${ids[i]}|${ids[j]}`;
          pares.set(par, (pares.get(par) ?? 0) + 1);
        }
      }
    }

    // Clientes destacados
    const mejores = [...clientes.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5);
    const usuariosTop = await this.prisma.usuario.findMany({
      where: { id: { in: mejores.map(([id]) => id) } },
      select: { id: true, nombre: true, email: true },
    });
    const datosUsuario = new Map(usuariosTop.map((u) => [u.id, u]));

    const estados = new Map<string, number>();

for (const p of todos) {
 
  const estado =
    p.estado === 'pendiente'
      ? ESTADO_PEDIDO.PENDIENTE_PAGO
      : p.estado;

  estados.set(estado, (estados.get(estado) ?? 0) + 1);
}
    return {
      ingresosTotales: redondear(ingresos),
      pedidosPagados: cantidad,
      ticketPromedio: cantidad > 0 ? redondear(ingresos / cantidad) : 0,
      pedidosPendientes: estados.get(ESTADO_PEDIDO.PENDIENTE_PAGO) ?? 0,
      ingresosAnterior: redondear(ingresosAnterior),
      pedidosAnterior,
      tasaConversion: creados > 0 ? redondear((creadosPagados / creados) * 100) : 0,
      pedidosCreados: creados,
      usuariosNuevos,
      clientesRecurrentes: [...clientes.values()].filter((c) => c.pedidos >= 2).length,

      ventasPorDia: [...porDia.entries()].map(([fecha, v]) => ({
        fecha,
        total: redondear(v.total),
        pedidos: v.pedidos,
      })),
      ventasPorDiaSemana: DIAS_SEMANA.map((d, i) => ({
        dia: ETIQUETAS_DIA[i],
        total: redondear(semana.get(d)?.total ?? 0),
        pedidos: semana.get(d)?.pedidos ?? 0,
      })),
      ventasPorHora: horas.map((pedidosHora, hora) => ({ hora, pedidos: pedidosHora })),

      topProductos: [...vendidos.values()]
        .sort((a, b) => b.unidades - a.unidades)
        .slice(0, 5)
        .map((p) => ({ ...p, ingresos: redondear(p.ingresos) })),
      ventasPorCategoria: [...categorias.entries()]
        .map(([categoria, v]) => ({ categoria, total: redondear(v.total), unidades: v.unidades }))
        .sort((a, b) => b.total - a.total),
      productosRelacionados: [...pares.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([par, veces]) => {
          const [idA, idB] = par.split('|');
          return { a: nombres.get(idA) ?? idA, b: nombres.get(idB) ?? idB, veces };
        }),
      productosSinMovimiento: productosDB
        .filter((p) => p.stock > 0 && !vendidos.has(p.id))
        .sort((a, b) => b.stock - a.stock)
        .slice(0, 8)
        .map((p) => ({ id: p.id, nombre: p.nombre, stock: p.stock })),
      stockBajo: productosDB
        .filter((p) => p.stock <= 5)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 10)
        .map((p) => ({ id: p.id, nombre: p.nombre, stock: p.stock })),

      topClientes: mejores.map(([id, v]) => ({
        id,
        nombre: datosUsuario.get(id)?.nombre ?? 'Usuario eliminado',
        email: datosUsuario.get(id)?.email ?? '',
        pedidos: v.pedidos,
        total: redondear(v.total),
      })),
      usuariosPorDia: [...usuariosPorDia.entries()].map(([fecha, cant]) => ({
        fecha,
        cantidad: cant,
      })),

      ventasPorMetodo: [...metodos.entries()].map(([metodo, v]) => ({
        metodo,
        total: redondear(v.total),
        pedidos: v.pedidos,
      })),
      pedidosPorEstado: [...estados.entries()].map(([estado, cant]) => ({
        estado,
        cantidad: cant,
      })),
    };
  }
}