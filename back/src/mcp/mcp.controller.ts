import { Controller, Post, Get, Delete, Req, Res, HttpCode } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { McpService } from './mcp.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JWT_SECRET } from '../auth/auth.constants.js';
import { OBJECT_ID } from '../comun/object-id.js';
import type { JwtPayload, UserAuthContext } from '../auth/types/auth.types.js';
import { Rol } from '../usuarios/usuarios.model.js';

// Endpoint MCP (Model Context Protocol) con transporte "Streamable HTTP" en modo sin sesion:
// cada POST /mcp es independiente, asi funciona igual aunque Render reinicie el servidor.
@Controller('mcp')
export class McpController {
  private readonly jwt = new JwtService({ secret: JWT_SECRET });

  constructor(
    private readonly mcp: McpService,
    private readonly prisma: PrismaService,
  ) {}

  // El token es opcional: sin el solo se pueden usar las herramientas del catalogo
  private async usuarioDe(req: Request): Promise<UserAuthContext | null> {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    try {
      const payload = this.jwt.verify<JwtPayload>(header.slice(7));
      if (!payload?.sub || !OBJECT_ID.test(payload.sub)) return null;
      const u = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
      if (!u || u.activo === false) return null;
      return { userId: u.id, email: u.email, rol: u.rol as Rol };
    } catch {
      return null;
    }
  }

  @Post()
  async manejar(@Req() req: Request, @Res() res: Response) {
    const server = this.mcp.crearServidor(await this.usuarioDe(req));
    // enableJsonResponse: responde JSON normal en lugar de un stream SSE (mas simple de probar)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Error interno' }, id: null });
      }
    }
  }

  // En modo sin sesion no hay stream de notificaciones ni sesiones que cerrar
  @Get()
  @HttpCode(405)
  noPermitidoGet() {
    return { jsonrpc: '2.0', error: { code: -32000, message: 'Metodo no permitido: usa POST' }, id: null };
  }

  @Delete()
  @HttpCode(405)
  noPermitidoDelete() {
    return { jsonrpc: '2.0', error: { code: -32000, message: 'Metodo no permitido: usa POST' }, id: null };
  }
}
