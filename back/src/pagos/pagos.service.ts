import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Pedido as PedidoDB } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ESTADO_PEDIDO, MINUTOS_RESERVA } from '../pedidos/pedido.constants.js';
import { Rol } from '../usuarios/usuarios.model.js';
import type { UserAuthContext } from '../auth/types/auth.types.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;
const PROVEEDORES = ['MERCADOPAGO', 'PAYPAL'] as const;
type Proveedor = (typeof PROVEEDORES)[number];
type Cabeceras = Record<string, string | undefined>;

type Resultado = {
  estado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE' | 'REEMBOLSADO';
  pagoIdExterno: string;
  monto: number;
  moneda: string;
};

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);
  private paypalTokenCache?: { token: string; expira: number };

  constructor(private prisma: PrismaService) {}

  // ---------- utilidades ----------

  private requerir(nombre: string) {
    const valor = process.env[nombre];
    if (!valor) throw new Error(`Falta ${nombre} en el .env`);
    return valor;
  }

  private front() {
    return (process.env.FRONTEND_URL || 'http://localhost:4321').replace(/\/$/, '');
  }

  private webhookBase() {
    const base = process.env.BACKEND_PUBLIC_URL;
    return base && base.startsWith('https://') ? base.replace(/\/$/, '') : null;
  }

  private async pedidoDe(id: string, user: UserAuthContext, permitirAdmin = false) {
    if (!OBJECT_ID.test(id)) throw new NotFoundException('Pedido no encontrado');
    const pedido = await this.prisma.pedido.findUnique({ where: { id } });
    const esAdmin = permitirAdmin && user.rol === Rol.ADMIN;
    if (!pedido || (!esAdmin && pedido.usuarioId !== user.userId)) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return pedido;
  }

  // ---------- iniciar pago ----------

  async iniciarPago(pedidoId: string, proveedor: string, user: UserAuthContext) {
    if (!PROVEEDORES.includes(proveedor as Proveedor)) {
      throw new BadRequestException('Metodo de pago no valido');
    }
    const pedido = await this.pedidoDe(pedidoId, user);
    if (pedido.estado !== ESTADO_PEDIDO.PENDIENTE_PAGO) {
      throw new BadRequestException('Este pedido ya no esta pendiente de pago');
    }

    // Cada intento de pago renueva la reserva del stock
    await this.prisma.pedido.update({
      where: { id: pedido.id },
      data: { expiraEn: new Date(Date.now() + MINUTOS_RESERVA * 60_000) },
    });

    const moneda = proveedor === 'PAYPAL' ? this.paypalMoneda() : 'MXN';
    const pago = await this.prisma.pago.create({
      data: { pedidoId: pedido.id, proveedor, monto: pedido.total, moneda },
    });

    try {
      const { url, referencia } =
        proveedor === 'MERCADOPAGO'
          ? await this.crearPreferenciaMP(pedido)
          : await this.crearOrdenPayPal(pedido, pago.id, moneda);

      await this.prisma.pago.update({ where: { id: pago.id }, data: { referencia } });
      return { url, pagoId: pago.id };
    } catch (e) {
      await this.prisma.pago.update({ where: { id: pago.id }, data: { estado: 'ERROR' } });
      this.logger.error(`No se pudo iniciar el pago (${proveedor}): ${(e as Error).message}`);
      throw new BadRequestException('No se pudo iniciar el pago. Intenta de nuevo.');
    }
  }

  // ---------- confirmar (regreso del cliente / Mis pedidos) ----------

  async confirmar(pedidoId: string, user: UserAuthContext) {
    const pedido = await this.pedidoDe(pedidoId, user, true);
    if (pedido.estado === ESTADO_PEDIDO.PAGADO) return pedido;

    const pagos = await this.prisma.pago.findMany({
      where: { pedidoId: pedido.id, estado: 'PENDIENTE' },
    });

    if (pagos.some((p) => p.proveedor === 'MERCADOPAGO')) {
      await this.sincronizarMP(pedido.id);
    }
    for (const pago of pagos.filter((p) => p.proveedor === 'PAYPAL' && p.referencia)) {
      const r = await this.resultadoPayPal(pago.referencia!);
      if (r) await this.aplicarResultado(r.pedidoId, 'PAYPAL', r.resultado, pago.referencia!);
    }

    return this.prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id } });
  }

  // ---------- Mercado Pago ----------

  private async mp(path: string, init: { method?: string; body?: unknown } = {}) {
    const token = this.requerir('MP_ACCESS_TOKEN');
    const res = await fetch(`https://api.mercadopago.com${path}`, {
      method: init.method ?? 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const data: any = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  private async crearPreferenciaMP(pedido: PedidoDB) {
    const base = this.front();
    const volver = (estado: string) =>
      `${base}/pago/resultado?pedido=${pedido.id}&proveedor=MERCADOPAGO&estado=${estado}`;

    const body: Record<string, unknown> = {
      items: pedido.detalles.map((d) => ({
        id: d.productoId,
        title: d.nombre,
        quantity: d.cantidad,
        unit_price: d.precioUnit,
        currency_id: 'MXN',
      })),
      external_reference: pedido.id,
      back_urls: { success: volver('success'), failure: volver('failure'), pending: volver('pending') },
      auto_return: 'approved',
    };

    const webhook = this.webhookBase();
    if (webhook) body.notification_url = `${webhook}/webhooks/mercadopago`;

    const r = await this.mp('/checkout/preferences', { method: 'POST', body });
    if (!r.ok) throw new Error(`Mercado Pago respondio ${r.status}: ${JSON.stringify(r.data)}`);

    const url = process.env.MP_SANDBOX === 'true' ? r.data.sandbox_init_point : r.data.init_point;
    return { url: (url || r.data.init_point) as string, referencia: String(r.data.id) };
  }

  private mapEstadoMP(status: string): Resultado['estado'] {
    switch (status) {
      case 'approved':
        return 'APROBADO';
      case 'rejected':
      case 'cancelled':
        return 'RECHAZADO';
      case 'refunded':
      case 'charged_back':
        return 'REEMBOLSADO';
      default:
        return 'PENDIENTE';
    }
  }

  private resultadoDePagoMP(p: any): { pedidoId: string; resultado: Resultado } | null {
    const pedidoId = p?.external_reference;
    if (!pedidoId || !OBJECT_ID.test(pedidoId)) return null;
    return {
      pedidoId,
      resultado: {
        estado: this.mapEstadoMP(p.status),
        pagoIdExterno: String(p.id),
        monto: Number(p.transaction_amount),
        moneda: p.currency_id,
      },
    };
  }

  private async sincronizarMP(pedidoId: string) {
    const r = await this.mp(
      `/v1/payments/search?external_reference=${pedidoId}&sort=date_created&criteria=desc`,
    );
    if (!r.ok) return;
    const lista: any[] = r.data.results ?? [];
    const elegido = lista.find((p) => p.status === 'approved') ?? lista[0];
    const res = elegido ? this.resultadoDePagoMP(elegido) : null;
    if (res) await this.aplicarResultado(res.pedidoId, 'MERCADOPAGO', res.resultado);
  }

  private firmaMPValida(headers: Cabeceras, dataId: string): boolean {
    const secret = process.env.MP_WEBHOOK_SECRET;
    const firma = headers['x-signature'];
    // La verificacion que de verdad protege es consultar el pago a la API de Mercado Pago
    if (!secret || !firma) return true;

    const partes: Record<string, string> = {};
    for (const trozo of firma.split(',')) {
      const [k, v] = trozo.trim().split('=');
      if (k && v) partes[k] = v;
    }
    if (!partes.ts || !partes.v1) return false;

    const manifest = `id:${dataId.toLowerCase()};request-id:${headers['x-request-id'] ?? ''};ts:${partes.ts};`;
    const esperado = Buffer.from(createHmac('sha256', secret).update(manifest).digest('hex'));
    const recibido = Buffer.from(partes.v1);
    return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
  }

  async procesarWebhookMP(query: Record<string, string>, body: any, headers: Cabeceras) {
    const tipo = body?.type ?? query.type ?? query.topic;
    const paymentId = query['data.id'] ?? body?.data?.id ?? query.id;
    if (tipo !== 'payment' || !paymentId) return; // otros tipos de aviso no nos interesan

    if (!this.firmaMPValida(headers, String(paymentId))) {
      throw new UnauthorizedException('Firma invalida');
    }

    const r = await this.mp(`/v1/payments/${paymentId}`);
    if (r.status === 404) {
      this.logger.warn(`Mercado Pago aviso un pago que no existe (${paymentId}). Es normal con el simulador.`);
      return;
    }
    if (!r.ok) throw new Error(`No se pudo consultar el pago ${paymentId}: ${r.status}`); // responde 500 y MP reintenta

    const res = this.resultadoDePagoMP(r.data);
    if (res) await this.aplicarResultado(res.pedidoId, 'MERCADOPAGO', res.resultado);
    await this.registrarEvento('MERCADOPAGO', String(body?.id ?? paymentId), String(tipo));
  }

  // ---------- PayPal ----------

  private paypalBase() {
    return process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  private paypalMoneda() {
    return process.env.PAYPAL_CURRENCY || 'MXN';
  }

  private async paypalToken() {
    if (this.paypalTokenCache && this.paypalTokenCache.expira > Date.now()) {
      return this.paypalTokenCache.token;
    }
    const id = this.requerir('PAYPAL_CLIENT_ID');
    const secret = this.requerir('PAYPAL_CLIENT_SECRET');
    const res = await fetch(`${this.paypalBase()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`PayPal (token) respondio ${res.status}: ${JSON.stringify(data)}`);

    this.paypalTokenCache = {
      token: data.access_token,
      expira: Date.now() + (Number(data.expires_in) - 60) * 1000,
    };
    return data.access_token as string;
  }

  private async paypal(
    path: string,
    init: { method?: string; body?: unknown; requestId?: string } = {},
  ) {
    const token = await this.paypalToken();
    const res = await fetch(`${this.paypalBase()}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.requestId ? { 'PayPal-Request-Id': init.requestId } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const data: any = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  private async crearOrdenPayPal(pedido: PedidoDB, pagoId: string, moneda: string) {
    const base = this.front();
    const volver = (estado: string) =>
      `${base}/pago/resultado?pedido=${pedido.id}&proveedor=PAYPAL&estado=${estado}`;

    const r = await this.paypal('/v2/checkout/orders', {
      method: 'POST',
      requestId: pagoId,
      body: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: pedido.id,
            custom_id: pedido.id,
            amount: { currency_code: moneda, value: pedido.total.toFixed(2) },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'Elixir',
              user_action: 'PAY_NOW',
              shipping_preference: 'NO_SHIPPING',
              return_url: volver('success'),
              cancel_url: volver('cancel'),
            },
          },
        },
      },
    });
    if (!r.ok) throw new Error(`PayPal respondio ${r.status}: ${JSON.stringify(r.data)}`);

    const link = (r.data.links ?? []).find(
      (l: { rel: string; href: string }) => l.rel === 'payer-action' || l.rel === 'approve',
    );
    if (!link) throw new Error('PayPal no devolvio el enlace de pago');
    return { url: link.href as string, referencia: r.data.id as string };
  }

  private mapEstadoPayPal(status: string): Resultado['estado'] {
    switch (status) {
      case 'COMPLETED':
        return 'APROBADO';
      case 'DECLINED':
      case 'FAILED':
        return 'RECHAZADO';
      case 'REFUNDED':
        return 'REEMBOLSADO';
      default:
        return 'PENDIENTE';
    }
  }

  // Consulta la orden a PayPal. Si el cliente ya aprobo pero falta cobrar, la captura aqui.
  private async resultadoPayPal(orderId: string): Promise<{ pedidoId: string; resultado: Resultado } | null> {
    let r = await this.paypal(`/v2/checkout/orders/${orderId}`);
    if (!r.ok) return null;

    if (r.data.status === 'APPROVED') {
      const cap = await this.paypal(`/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        requestId: `cap-${orderId}`,
      });
      r = cap.ok ? cap : await this.paypal(`/v2/checkout/orders/${orderId}`);
    }

    const unidad = r.data.purchase_units?.[0];
    const captura = unidad?.payments?.captures?.[0];
    const pedidoId = unidad?.custom_id ?? unidad?.reference_id ?? captura?.custom_id;
    if (!pedidoId || !OBJECT_ID.test(pedidoId)) return null;

    if (!captura) {
      return {
        pedidoId,
        resultado: {
          estado: r.data.status === 'VOIDED' ? 'RECHAZADO' : 'PENDIENTE',
          pagoIdExterno: orderId,
          monto: Number(unidad?.amount?.value ?? 0),
          moneda: unidad?.amount?.currency_code ?? this.paypalMoneda(),
        },
      };
    }

    return {
      pedidoId,
      resultado: {
        estado: this.mapEstadoPayPal(captura.status),
        pagoIdExterno: captura.id,
        monto: Number(captura.amount.value),
        moneda: captura.amount.currency_code,
      },
    };
  }

  private async firmaPayPalValida(headers: Cabeceras, evento: unknown) {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) return true; // sin id configurado se confia en la consulta a la API de PayPal

    const r = await this.paypal('/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      body: {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: evento,
      },
    });
    return r.ok && r.data.verification_status === 'SUCCESS';
  }

  async procesarWebhookPayPal(headers: Cabeceras, evento: any) {
    if (!(await this.firmaPayPalValida(headers, evento))) {
      throw new UnauthorizedException('Firma invalida');
    }

    const tipo: string = evento?.event_type ?? '';
    let orderId: string | undefined;
    if (tipo === 'CHECKOUT.ORDER.APPROVED') {
      orderId = evento.resource?.id;
    } else if (tipo.startsWith('PAYMENT.CAPTURE.')) {
      orderId = evento.resource?.supplementary_data?.related_ids?.order_id;
    }
    if (!orderId) return;

    const r = await this.resultadoPayPal(orderId);
    if (r) await this.aplicarResultado(r.pedidoId, 'PAYPAL', r.resultado, orderId);
    await this.registrarEvento('PAYPAL', String(evento.id), tipo);
  }

  // ---------- nucleo: aplicar un resultado (idempotente) ----------

  private async aplicarResultado(
    pedidoId: string,
    proveedor: Proveedor,
    r: Resultado,
    referencia?: string,
  ) {
    const pedido = await this.prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) {
      this.logger.warn(`Aviso de pago para un pedido que no existe: ${pedidoId}`);
      return;
    }

    let pago = await this.prisma.pago.findFirst({
      where: { pedidoId, proveedor, ...(referencia ? { referencia } : {}) },
      orderBy: { creadoEn: 'desc' },
    });
    if (!pago) {
      pago = await this.prisma.pago.create({
        data: { pedidoId, proveedor, referencia: referencia ?? null, monto: r.monto, moneda: r.moneda },
      });
    }

    if (r.estado !== 'APROBADO') {
      const yaAprobado = pago.estado === 'APROBADO' && r.estado !== 'REEMBOLSADO';
      if (!yaAprobado) {
        await this.prisma.pago.update({
          where: { id: pago.id },
          data: { estado: r.estado, pagoIdExterno: r.pagoIdExterno },
        });
      }
      return;
    }

    // Nunca se confia en lo que dice el aviso: el monto y la moneda deben coincidir con el pedido
    const montoOk = Math.abs(r.monto - pedido.total) < 0.01 && r.moneda === pago.moneda;
    if (!montoOk) {
      await this.prisma.pago.update({ where: { id: pago.id }, data: { estado: 'MONTO_INVALIDO' } });
      this.logger.error(
        `Monto invalido en pedido ${pedido.id}: esperado ${pedido.total} ${pago.moneda}, recibido ${r.monto} ${r.moneda}`,
      );
      return;
    }

    await this.prisma.pago.update({
      where: { id: pago.id },
      data: { estado: 'APROBADO', pagoIdExterno: r.pagoIdExterno },
    });

    const reclamado = await this.prisma.pedido.updateMany({
      where: { id: pedido.id, estado: ESTADO_PEDIDO.PENDIENTE_PAGO },
      data: { estado: ESTADO_PEDIDO.PAGADO, pagadoEn: new Date(), metodoPago: proveedor },
    });
    if (reclamado.count === 1) return;

    // Si no estaba pendiente, puede que ya estuviera pagado, o que haya expirado antes de que llegara el pago
    await this.reactivar(pedido, proveedor, pago.id);
  }

  private async reactivar(pedido: PedidoDB, proveedor: string, pagoId: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const reclamado = await tx.pedido.updateMany({
          where: {
            id: pedido.id,
            estado: { in: [ESTADO_PEDIDO.EXPIRADO, ESTADO_PEDIDO.CANCELADO] },
          },
          data: { estado: ESTADO_PEDIDO.PAGADO, pagadoEn: new Date(), metodoPago: proveedor },
        });
        if (reclamado.count === 0) return; // ya estaba pagado

        for (const d of pedido.detalles) {
          const ok = await tx.producto.updateMany({
            where: { id: d.productoId, stock: { gte: d.cantidad } },
            data: { stock: { decrement: d.cantidad } },
          });
          if (ok.count === 0) throw new Error('SIN_STOCK');
        }
      });
    } catch (e) {
      if ((e as Error).message === 'SIN_STOCK') {
        await this.prisma.pago.update({ where: { id: pagoId }, data: { estado: 'REQUIERE_REEMBOLSO' } });
        this.logger.error(`Pedido ${pedido.id} pagado despues de expirar y sin stock: hay que reembolsarlo`);
        return;
      }
      throw e;
    }
  }

  private async registrarEvento(proveedor: string, eventoId: string, tipo: string) {
    try {
      await this.prisma.webhookEvento.create({ data: { proveedor, eventoId, tipo } });
    } catch {
      // ya estaba registrado
    }
  }
}