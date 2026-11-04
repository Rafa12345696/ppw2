import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService, escapar } from '../mail/mail.service.js';
import { WhatsappService } from './whatsapp.service.js';

// Que se le dice al cliente en cada momento de su pedido
export const AVISOS: Record<string, { asunto: string; mensaje: string }> = {
  PAGADO: {
    asunto: 'Recibimos tu pago',
    mensaje: 'Recibimos el pago de tu pedido. En breve empezamos a prepararlo.',
  },
  PREPARANDO: {
    asunto: 'Estamos preparando tu pedido',
    mensaje: 'Estamos preparando tu pedido con cuidado para que llegue en buen estado.',
  },
  ENVIADO: { asunto: 'Tu pedido va en camino', mensaje: 'Tu pedido ya salio y va en camino.' },
  ENTREGADO: { asunto: 'Tu pedido fue entregado', mensaje: 'Tu pedido fue entregado. ¡Gracias por comprar en Elixir!' },
  CANCELADO: { asunto: 'Tu pedido fue cancelado', mensaje: 'Tu pedido fue cancelado y los productos se liberaron.' },
  EXPIRADO: {
    asunto: 'Tu pedido expiro',
    mensaje: 'No recibimos el pago a tiempo, asi que tu pedido expiro y los productos se liberaron.',
  },
};

// Convierte el estado del pedido en la clave del aviso que le corresponde (null = no se avisa)
export function claveAviso(pedido: { estado: string; envio?: string | null }): string | null {
  if (pedido.estado === 'PAGADO') {
    const envio = pedido.envio ?? 'POR_PREPARAR';
    return envio === 'POR_PREPARAR' ? 'PAGADO' : envio;
  }
  if (pedido.estado === 'CANCELADO' || pedido.estado === 'EXPIRADO') return pedido.estado;
  return null;
}

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly whatsapp: WhatsappService,
  ) {}

  // Se llama despues de cualquier cambio de un pedido. Solo avisa si el estado es nuevo para el cliente.
  async avisarCambio(pedidoId: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { usuario: true },
    });
    if (!pedido) return;

    const clave = claveAviso(pedido);
    if (!clave || pedido.avisoEnviado === clave) return;

    // Se "reclama" el aviso antes de enviarlo: si llegan dos eventos juntos, solo uno lo manda
    const previo = pedido.avisoEnviado ?? null;
    const where: Prisma.PedidoWhereInput =
      previo === null
        ? { id: pedido.id, OR: [{ avisoEnviado: null }, { avisoEnviado: { isSet: false } }] }
        : { id: pedido.id, avisoEnviado: previo };
    const reclamado = await this.prisma.pedido.updateMany({ where, data: { avisoEnviado: clave } });
    if (reclamado.count === 0) return;

    const aviso = AVISOS[clave];
    const folio = pedido.id.slice(-6).toUpperCase();
    const enlace = `${process.env.FRONTEND_URL || 'http://localhost:4321'}/mis-pedidos`;
    const { usuario } = pedido;

    const envios: Promise<unknown>[] = [];

    if (this.mail.configurado()) {
      envios.push(
        this.mail.enviar({
          para: usuario.email,
          nombre: usuario.nombre,
          asunto: `${aviso.asunto} (pedido ${folio})`,
          texto: `Hola ${usuario.nombre},\n\n${aviso.mensaje}\n\nPedido ${folio} por $${pedido.total}.\nConsultalo en: ${enlace}`,
          html:
            `<p>Hola ${escapar(usuario.nombre)},</p>` +
            `<p>${escapar(aviso.mensaje)}</p>` +
            `<p>Pedido <b>${folio}</b> por <b>$${pedido.total}</b>.</p>` +
            `<p><a href="${escapar(enlace)}">Ver mis pedidos</a></p>`,
        }),
      );
    }

    if (usuario.telefono && this.whatsapp.configurado()) {
      envios.push(
        this.whatsapp.enviar(usuario.telefono, `Elixir: ${aviso.mensaje} Pedido ${folio}. ${enlace}`),
      );
    }

    // Un aviso que falla no debe romper el flujo del pedido: solo se registra
    const resultados = await Promise.allSettled(envios);
    for (const r of resultados) {
      if (r.status === 'rejected') {
        this.logger.error(`Aviso del pedido ${folio} no enviado: ${(r.reason as Error).message}`);
      }
    }
  }
}
