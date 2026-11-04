import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductosService } from '../productos/productos.service.js';
import { OBJECT_ID } from '../comun/object-id.js';
import type { UserAuthContext } from '../auth/types/auth.types.js';

// Respuesta de una herramienta: texto JSON que el agente puede leer
function respuesta(datos: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(datos, null, 2) }] };
}

function error(mensaje: string) {
  return { content: [{ type: 'text' as const, text: mensaje }], isError: true };
}

// Servidor MCP de SOLO LECTURA: expone consultas del catalogo y de pedidos a agentes de IA
// sin darles acceso directo a la base de datos ni ninguna accion que modifique algo.
@Injectable()
export class McpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productos: ProductosService,
  ) {}

  private urlProducto(id: string) {
    return `${process.env.FRONTEND_URL || 'http://localhost:4321'}/producto/${id}`;
  }

  // Se crea un servidor por peticion (modo sin sesion); "usuario" es quien mando su token, si lo mando
  crearServidor(usuario: UserAuthContext | null) {
    const server = new McpServer({ name: 'elixir', version: '1.0.0' });
    const soloLectura = { readOnlyHint: true, openWorldHint: false };

    server.registerTool(
      'listar_categorias',
      {
        title: 'Listar categorias',
        description: 'Lista las categorias de licores de la tienda Elixir.',
        annotations: soloLectura,
      },
      async () => {
        const categorias = await this.prisma.categoria.findMany({ orderBy: { nombre: 'asc' } });
        return respuesta(categorias.map((c) => ({ id: c.id, nombre: c.nombre })));
      },
    );

    server.registerTool(
      'buscar_productos',
      {
        title: 'Buscar productos',
        description:
          'Busca licores del catalogo de Elixir por nombre o descripcion, categoria, promociones o premium. Devuelve precio, stock y enlace.',
        inputSchema: {
          texto: z.string().max(100).optional().describe('Texto a buscar en nombre o descripcion'),
          categoria: z.string().max(60).optional().describe('Nombre de la categoria, por ejemplo Tequila'),
          soloPromociones: z.boolean().optional().describe('Solo productos con descuento'),
          soloPremium: z.boolean().optional().describe('Solo productos premium'),
          limite: z.number().int().min(1).max(50).optional().describe('Maximo de resultados (20 por defecto)'),
        },
        annotations: soloLectura,
      },
      async ({ texto, categoria, soloPromociones, soloPremium, limite }) => {
        const where: Prisma.ProductoWhereInput = {};
        if (texto) {
          where.OR = [
            { nombre: { contains: texto, mode: 'insensitive' } },
            { descripcion: { contains: texto, mode: 'insensitive' } },
          ];
        }
        if (categoria) where.categoria = { nombre: { equals: categoria, mode: 'insensitive' } };
        if (soloPremium) where.premium = true;

        const encontrados = await this.prisma.producto.findMany({
          where,
          include: { categoria: true },
          orderBy: { nombre: 'asc' },
          take: 200,
        });

        const lista = encontrados
          .filter((p) => !soloPromociones || (p.precioAntes ?? 0) > p.precio)
          .slice(0, limite ?? 20)
          .map((p) => ({
            id: p.id,
            nombre: p.nombre,
            categoria: p.categoria.nombre,
            precio: p.precio,
            precioAntes: p.precioAntes ?? null,
            premium: Boolean(p.premium),
            disponibles: p.stock,
            url: this.urlProducto(p.id),
          }));
        return respuesta(lista);
      },
    );

    server.registerTool(
      'mas_vendidos',
      {
        title: 'Mas vendidos',
        description: 'Los productos con mas unidades vendidas en pedidos pagados.',
        inputSchema: {
          limite: z.number().int().min(1).max(20).optional().describe('Cuantos productos (5 por defecto)'),
        },
        annotations: soloLectura,
      },
      async ({ limite }) => {
        const lista = await this.productos.masVendidos(limite ?? 5);
        return respuesta(
          lista.map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio, url: this.urlProducto(p.id) })),
        );
      },
    );

    server.registerTool(
      'estado_pedido',
      {
        title: 'Estado de un pedido',
        description:
          'Consulta el estado de pago y de envio de un pedido. Requiere el token de sesion del cliente (encabezado Authorization: Bearer). Un cliente solo ve sus propios pedidos.',
        inputSchema: {
          pedidoId: z.string().describe('ID del pedido (24 caracteres)'),
        },
        annotations: soloLectura,
      },
      async ({ pedidoId }) => {
        if (!usuario) {
          return error('Para consultar un pedido manda el token de sesion en el encabezado Authorization: Bearer <token>.');
        }
        const pedido = OBJECT_ID.test(pedidoId)
          ? await this.prisma.pedido.findUnique({ where: { id: pedidoId } })
          : null;
        // Mismo mensaje si no existe o si es de otra persona: no se revela que existe
        if (!pedido || (usuario.rol !== 'ADMIN' && pedido.usuarioId !== usuario.userId)) {
          return error('Pedido no encontrado.');
        }
        return respuesta({
          id: pedido.id,
          fecha: pedido.fecha,
          estado: pedido.estado,
          envio: pedido.estado === 'PAGADO' ? (pedido.envio ?? 'POR_PREPARAR') : null,
          total: pedido.total,
          metodoPago: pedido.metodoPago ?? null,
          productos: pedido.detalles.map((d) => ({ nombre: d.nombre, cantidad: d.cantidad })),
        });
      },
    );

    return server;
  }
}
