import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OBJECT_ID } from '../comun/object-id.js';
import { esMayorDeEdad } from '../comun/edad.js';
import {
  DIDIT_API,
  estadoDe,
  fechaDeLaIne,
  firmaDiditValida,
  verificacionObligatoria,
  type EstadoVerificacion,
} from './didit.js';

type Cabeceras = Record<string, string | undefined>;

// Mientras esta en uno de estos, se le pregunta a Didit si ya hay resultado
const EN_CURSO: (string | null | undefined)[] = ['PENDIENTE', 'EN_REVISION'];

@Injectable()
export class IdentidadService {
  private readonly logger = new Logger(IdentidadService.name);

  constructor(private prisma: PrismaService) {}

  private frontend() {
    return (process.env.FRONTEND_URL || 'http://localhost:4321').replace(/\/$/, '');
  }

  private async didit(ruta: string, init: { method?: string; body?: string } = {}) {
    const r = await fetch(`${DIDIT_API}${ruta}`, {
      ...init,
      headers: {
        'x-api-key': process.env.DIDIT_API_KEY ?? '',
        'Content-Type': 'application/json',
      },
    });
    const data: any = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, data };
  }

  // Crea la sesion en Didit y regresa el enlace donde el cliente toma foto a su INE y su selfie
  async iniciar(usuarioId: string) {
    if (!verificacionObligatoria()) {
      throw new BadRequestException('La verificacion de identidad no esta activada en esta tienda');
    }
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (usuario.identidadVerificada) throw new BadRequestException('Tu identidad ya esta verificada');
    if (usuario.verificacionEstado === 'MENOR') {
      throw new BadRequestException('Tu INE indica que eres menor de edad');
    }

    const r = await this.didit('/v3/session/', {
      method: 'POST',
      body: JSON.stringify({
        workflow_id: process.env.DIDIT_WORKFLOW_ID,
        vendor_data: usuarioId, // asi sabemos de quien es el resultado
        callback: `${this.frontend()}/verificar-identidad`,
        language: 'es',
      }),
    });
    if (!r.ok || !r.data?.url || !r.data?.session_id) {
      this.logger.error(`Didit no creo la sesion (${r.status}): ${JSON.stringify(r.data)}`);
      throw new ServiceUnavailableException('No se pudo iniciar la verificacion. Intenta mas tarde.');
    }

    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { verificacionSesion: String(r.data.session_id), verificacionEstado: 'PENDIENTE' },
    });
    return { url: String(r.data.url) };
  }

  // Lo que ve el cliente. Si sigue en curso le pregunta a Didit (sirve aunque el aviso no llegue)
  async estado(usuarioId: string) {
    let usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const requerida = verificacionObligatoria();
    if (requerida && !usuario.identidadVerificada && usuario.verificacionSesion && EN_CURSO.includes(usuario.verificacionEstado)) {
      try {
        await this.sincronizar(usuario.verificacionSesion);
        usuario = (await this.prisma.usuario.findUnique({ where: { id: usuarioId } })) ?? usuario;
      } catch (e) {
        this.logger.warn(`No se pudo consultar Didit: ${(e as Error).message}`);
      }
    }

    return {
      requerida,
      verificada: Boolean(usuario.identidadVerificada),
      estado: usuario.verificacionEstado ?? null,
    };
  }

  // Pide el resultado a Didit. Nunca se confia en lo que trae el aviso: siempre se consulta
  async sincronizar(sessionId: string) {
    const r = await this.didit(`/v3/session/${encodeURIComponent(sessionId)}/decision/`);
    if (r.status === 404) return; // la sesion aun no tiene resultado
    if (!r.ok) throw new Error(`Didit respondio ${r.status}`);
    await this.aplicarDecision(r.data);
  }

  async aplicarDecision(decision: any) {
    const usuarioId = String(decision?.vendor_data ?? '');
    const sessionId = String(decision?.session_id ?? '');
    if (!OBJECT_ID.test(usuarioId) || !sessionId) return;

    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    // Solo cuenta la ultima sesion que se le creo; una ya verificada no se puede bajar
    if (!usuario || usuario.verificacionSesion !== sessionId || usuario.identidadVerificada) return;

    let estado: EstadoVerificacion = estadoDe(decision?.status);
    const data: { verificacionEstado: string; identidadVerificada?: boolean; fechaNacimiento?: Date } = {
      verificacionEstado: estado,
    };

    if (estado === 'APROBADA') {
      // La fecha buena es la de la INE, no la que escribio al registrarse
      const fecha = fechaDeLaIne(decision);
      if (!esMayorDeEdad(fecha)) {
        estado = 'MENOR';
        data.verificacionEstado = estado;
      } else {
        data.identidadVerificada = true;
        data.fechaNacimiento = fecha!;
      }
    }

    await this.prisma.usuario.update({ where: { id: usuarioId }, data });
    this.logger.log(`Verificacion de ${usuarioId}: ${estado}`);
  }

  // Aviso de Didit (POST /webhooks/didit)
  async procesarWebhook(cuerpo: any, headers: Cabeceras) {
    const secreto = process.env.DIDIT_WEBHOOK_SECRET;
    if (secreto && !firmaDiditValida(cuerpo, headers['x-signature-v2'], headers['x-timestamp'], secreto)) {
      throw new UnauthorizedException('Firma invalida');
    }

    const sessionId = cuerpo?.session_id;
    if (!sessionId || !verificacionObligatoria()) return;

    // Avisos de prueba de Didit o de sesiones que no son de ninguna cuenta: se contestan 200 y ya
    const dueno = await this.prisma.usuario.findFirst({
      where: { verificacionSesion: String(sessionId) },
      select: { id: true },
    });
    if (!dueno) return;

    const eventoId = String(cuerpo?.event_id ?? '');
    if (eventoId) {
      const visto = await this.prisma.webhookEvento.findUnique({
        where: { proveedor_eventoId: { proveedor: 'DIDIT', eventoId } },
      });
      if (visto) return;
    }

    await this.sincronizar(String(sessionId)); // si falla responde 500 y Didit reintenta

    if (eventoId) {
      try {
        await this.prisma.webhookEvento.create({
          data: { proveedor: 'DIDIT', eventoId, tipo: String(cuerpo?.webhook_type ?? '') },
        });
      } catch {
        // ya estaba registrado
      }
    }
  }
}
