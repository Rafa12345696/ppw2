import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventosService } from '../eventos/eventos.service.js';
import { ESTADO_PEDIDO } from '../pedidos/pedido.constants.js';
import { Rol } from '../usuarios/usuarios.model.js';
import { OBJECT_ID, normalizarPagina, armarPagina, rangoFechas } from './paginacion.js';
import type {
  FiltroProductos,
  FiltroPedidos,
  FiltroFacturas,
  FiltroPagos,
  FiltroUsuarios,
  ActualizarUsuarioInput,
} from './backoffice.models.js';

const contiene = (texto: string) => ({ contains: texto, mode: 'insensitive' as const });
const folio = (id: string) => `ELX-${id.slice(-8).toUpperCase()}`;

// "Activo" incluye cuentas viejas que no tienen el campo
const ACTIVO: Prisma.UsuarioWhereInput[] = [{ activo: true }, { activo: { isSet: false } }, { activo: null }];

type FiltroPedidoComun = {
  buscar?: string | null;
  estado?: string | null;
  envio?: string | null;
  metodoPago?: string | null;
  desde?: string | null;
  hasta?: string | null;
};

// Evita que una celda de Excel se ejecute como formula, y escapa comillas
const celda = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

@Injectable()
export class BackofficeService {
  constructor(
    private prisma: PrismaService,
    private eventos: EventosService,
  ) {}

  // ---------------- productos ----------------

  async productosPagina(f: FiltroProductos | undefined, pagina?: number | null, porPagina?: number | null) {
    const pg = normalizarPagina(pagina, porPagina);
    const where: Prisma.ProductoWhereInput = {};

    const buscar = f?.buscar?.trim();
    if (buscar) where.OR = [{ nombre: contiene(buscar) }, { descripcion: contiene(buscar) }];
    if (f?.categoriaId && OBJECT_ID.test(f.categoriaId)) where.categoriaId = f.categoriaId;
    if (f?.stock === 'AGOTADO') where.stock = { lte: 0 };
    else if (f?.stock === 'BAJO') where.stock = { gt: 0, lte: 5 };

    const [items, total] = await Promise.all([
      this.prisma.producto.findMany({ where, orderBy: { nombre: 'asc' }, skip: pg.skip, take: pg.take }),
      this.prisma.producto.count({ where }),
    ]);
    return armarPagina(items, total, pg.pagina, pg.porPagina);
  }

  // ---------------- pedidos y facturas ----------------

  // El folio visible es el final del id: no se puede buscar "termina en" en la base, asi que se filtra aqui
  private async idsPedidoPorFolio(texto: string) {
    const limpio = texto.replace(/^elx-/i, '').replace(/^#/, '').toLowerCase();
    if (!/^[a-f\d]{4,24}$/.test(limpio)) return [];
    const filas = await this.prisma.pedido.findMany({ select: { id: true } });
    return filas.map((p) => p.id).filter((id) => id.toLowerCase().endsWith(limpio));
  }

  private async clausulasPedido(f: FiltroPedidoComun | undefined, campoFecha: 'fecha' | 'pagadoEn') {
    const AND: Prisma.PedidoWhereInput[] = [];

    const buscar = f?.buscar?.trim();
    if (buscar) {
      const OR: Prisma.PedidoWhereInput[] = [
        { usuario: { is: { OR: [{ nombre: contiene(buscar) }, { email: contiene(buscar) }] } } },
      ];
      const ids = await this.idsPedidoPorFolio(buscar);
      if (ids.length > 0) OR.push({ id: { in: ids } });
      AND.push({ OR });
    }

    if (f?.estado) AND.push({ estado: f.estado });
    if (f?.metodoPago) AND.push({ metodoPago: f.metodoPago });

    if (f?.envio === 'POR_PREPARAR') {
      AND.push({ estado: ESTADO_PEDIDO.PAGADO });
      AND.push({ OR: [{ envio: null }, { envio: { isSet: false } }, { envio: 'POR_PREPARAR' }] });
    } else if (f?.envio) {
      AND.push({ envio: f.envio });
    }

    const rango = rangoFechas(f?.desde, f?.hasta);
    if (rango) AND.push(campoFecha === 'fecha' ? { fecha: rango } : { pagadoEn: rango });

    return AND;
  }

  async pedidosPagina(f: FiltroPedidos | undefined, pagina?: number | null, porPagina?: number | null) {
    const pg = normalizarPagina(pagina, porPagina);
    const AND = await this.clausulasPedido(f, 'fecha');
    const where: Prisma.PedidoWhereInput = AND.length > 0 ? { AND } : {};

    const [items, total] = await Promise.all([
      this.prisma.pedido.findMany({ where, orderBy: { fecha: 'desc' }, skip: pg.skip, take: pg.take }),
      this.prisma.pedido.count({ where }),
    ]);
    return armarPagina(items, total, pg.pagina, pg.porPagina);
  }

  private async whereFacturas(f: FiltroFacturas | undefined) {
    const AND = await this.clausulasPedido(f, 'pagadoEn');
    AND.push({ estado: ESTADO_PEDIDO.PAGADO });
    return { AND } as Prisma.PedidoWhereInput;
  }

  async facturasPagina(f: FiltroFacturas | undefined, pagina?: number | null, porPagina?: number | null) {
    const pg = normalizarPagina(pagina, porPagina);
    const where = await this.whereFacturas(f);

    const [items, total] = await Promise.all([
      this.prisma.pedido.findMany({ where, orderBy: { pagadoEn: 'desc' }, skip: pg.skip, take: pg.take }),
      this.prisma.pedido.count({ where }),
    ]);
    return armarPagina(items, total, pg.pagina, pg.porPagina);
  }

  async exportarFacturasCsv(f: FiltroFacturas | undefined) {
    const where = await this.whereFacturas(f);
    const pedidos = await this.prisma.pedido.findMany({
      where,
      orderBy: { pagadoEn: 'desc' },
      take: 5000,
      include: { usuario: { select: { nombre: true, email: true } } },
    });

    const filas = [
      ['Folio', 'Fecha de pago', 'Cliente', 'Correo', 'Metodo de pago', 'Total', 'Productos'].map(celda).join(','),
    ];
    for (const p of pedidos) {
      const fecha = p.pagadoEn
        ? p.pagadoEn.toLocaleString('sv-SE', { timeZone: 'America/Mexico_City' })
        : '';
      filas.push(
        [
          celda(folio(p.id)),
          celda(fecha),
          celda(p.usuario?.nombre),
          celda(p.usuario?.email),
          celda(p.metodoPago),
          p.total.toFixed(2),
          celda(p.detalles.map((d) => `${d.nombre} x${d.cantidad}`).join('; ')),
        ].join(','),
      );
    }
    // El BOM hace que Excel respete acentos
    return '\uFEFF' + filas.join('\r\n');
  }

  // ---------------- pagos ----------------

  async pagosPagina(f: FiltroPagos | undefined, pagina?: number | null, porPagina?: number | null) {
    const pg = normalizarPagina(pagina, porPagina);
    const AND: Prisma.PagoWhereInput[] = [];

    const buscar = f?.buscar?.trim();
    if (buscar) {
      const OR: Prisma.PagoWhereInput[] = [
        { pagoIdExterno: contiene(buscar) },
        { referencia: contiene(buscar) },
      ];
      const ids = await this.idsPedidoPorFolio(buscar);
      if (ids.length > 0) OR.push({ pedidoId: { in: ids } });
      AND.push({ OR });
    }
    if (f?.proveedor) AND.push({ proveedor: f.proveedor });
    if (f?.estado) AND.push({ estado: f.estado });
    const rango = rangoFechas(f?.desde, f?.hasta);
    if (rango) AND.push({ creadoEn: rango });

    const where: Prisma.PagoWhereInput = AND.length > 0 ? { AND } : {};
    const [items, total] = await Promise.all([
      this.prisma.pago.findMany({ where, orderBy: { creadoEn: 'desc' }, skip: pg.skip, take: pg.take }),
      this.prisma.pago.count({ where }),
    ]);
    return armarPagina(items, total, pg.pagina, pg.porPagina);
  }

  // ---------------- usuarios ----------------

  async usuariosPagina(f: FiltroUsuarios | undefined, pagina?: number | null, porPagina?: number | null) {
    const pg = normalizarPagina(pagina, porPagina);
    const AND: Prisma.UsuarioWhereInput[] = [];

    const buscar = f?.buscar?.trim();
    if (buscar) AND.push({ OR: [{ nombre: contiene(buscar) }, { email: contiene(buscar) }] });
    if (f?.rol) AND.push({ rol: f.rol === Rol.ADMIN ? 'ADMIN' : 'CLIENTE' });
    if (f?.estado === 'ACTIVO') AND.push({ OR: ACTIVO });
    else if (f?.estado === 'DESACTIVADO') AND.push({ activo: false });

    const where: Prisma.UsuarioWhereInput = AND.length > 0 ? { AND } : {};
    const [items, total] = await Promise.all([
      this.prisma.usuario.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take }),
      this.prisma.usuario.count({ where }),
    ]);
    return armarPagina(items, total, pg.pagina, pg.porPagina);
  }

  async actualizarUsuario(id: string, data: ActualizarUsuarioInput, adminId: string) {
    if (!OBJECT_ID.test(id)) throw new NotFoundException('Usuario no encontrado');
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const cambios: { nombre?: string; rol?: 'CLIENTE' | 'ADMIN' } = {};

    if (data.nombre !== undefined && data.nombre !== null) {
      const nombre = data.nombre.trim();
      if (nombre.length < 2) throw new BadRequestException('El nombre debe tener al menos 2 caracteres');
      cambios.nombre = nombre;
    }

    if (data.rol) {
      const nuevo = data.rol === Rol.ADMIN ? 'ADMIN' : 'CLIENTE';
      if (nuevo !== usuario.rol) {
        if (id === adminId) throw new BadRequestException('No puedes cambiar tu propio rol');

        if (usuario.rol === 'ADMIN' && nuevo === 'CLIENTE') {
          const otros = await this.prisma.usuario.count({
            where: { rol: 'ADMIN', id: { not: id }, OR: ACTIVO },
          });
          if (otros === 0) throw new BadRequestException('Debe quedar al menos un administrador activo');
        }
        cambios.rol = nuevo;
      }
    }

    return this.prisma.usuario.update({ where: { id }, data: cambios });
  }

  async restablecerPassword(id: string, password: string) {
    if (!OBJECT_ID.test(id)) throw new NotFoundException('Usuario no encontrado');
    if (password.length < 6) throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');

    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    await this.prisma.usuario.update({
      where: { id },
      data: { password: await bcrypt.hash(password, 10) },
    });
    return true;
  }

  // ---------------- categorias ----------------

  async categoriasAdmin() {
    const [categorias, productos] = await Promise.all([
      this.prisma.categoria.findMany({ orderBy: { nombre: 'asc' } }),
      this.prisma.producto.findMany({ select: { categoriaId: true } }),
    ]);
    const conteo = new Map<string, number>();
    for (const p of productos) conteo.set(p.categoriaId, (conteo.get(p.categoriaId) ?? 0) + 1);

    return categorias.map((c) => ({ id: c.id, nombre: c.nombre, totalProductos: conteo.get(c.id) ?? 0 }));
  }

  private nombreCategoria(nombre: string) {
    const n = nombre.trim();
    if (n.length < 2 || n.length > 40) {
      throw new BadRequestException('El nombre debe tener entre 2 y 40 caracteres');
    }
    return n;
  }

  private async validarNombreLibre(nombre: string, exceptoId?: string) {
    const repetida = await this.prisma.categoria.findFirst({
      where: {
        nombre: { equals: nombre, mode: 'insensitive' },
        ...(exceptoId ? { id: { not: exceptoId } } : {}),
      },
    });
    if (repetida) throw new ConflictException('Ya existe una categoria con ese nombre');
  }

  async crearCategoria(nombre: string) {
    const n = this.nombreCategoria(nombre);
    await this.validarNombreLibre(n);
    const c = await this.prisma.categoria.create({ data: { nombre: n } });
    await this.eventos.estadisticasCambio('categoria', c.id);
    return { id: c.id, nombre: c.nombre, totalProductos: 0 };
  }

  async actualizarCategoria(id: string, nombre: string) {
    if (!OBJECT_ID.test(id)) throw new NotFoundException('Categoria no encontrada');
    const n = this.nombreCategoria(nombre);
    const existe = await this.prisma.categoria.findUnique({ where: { id } });
    if (!existe) throw new NotFoundException('Categoria no encontrada');
    await this.validarNombreLibre(n, id);

    const c = await this.prisma.categoria.update({ where: { id }, data: { nombre: n } });
    const total = await this.prisma.producto.count({ where: { categoriaId: id } });
    await this.eventos.estadisticasCambio('categoria', id);
    return { id: c.id, nombre: c.nombre, totalProductos: total };
  }

  async eliminarCategoria(id: string) {
    if (!OBJECT_ID.test(id)) throw new NotFoundException('Categoria no encontrada');
    const existe = await this.prisma.categoria.findUnique({ where: { id } });
    if (!existe) throw new NotFoundException('Categoria no encontrada');

    const total = await this.prisma.producto.count({ where: { categoriaId: id } });
    if (total > 0) {
      throw new BadRequestException(
        `No se puede eliminar: tiene ${total} producto(s). Muevelos a otra categoria primero.`,
      );
    }
    await this.prisma.categoria.delete({ where: { id } });
    await this.eventos.estadisticasCambio('categoria', id);
    return true;
  }
}