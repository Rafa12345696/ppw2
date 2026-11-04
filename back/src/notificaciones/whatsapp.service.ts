import { Injectable } from '@nestjs/common';

// Mensajes de WhatsApp con la API REST de Twilio (sin SDK: un fetch basta)
@Injectable()
export class WhatsappService {
  configurado() {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_WHATSAPP_FROM,
    );
  }

  // telefono en formato +52XXXXXXXXXX
  async enviar(telefono: string, mensaje: string) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    // Se acepta con o sin el prefijo "whatsapp:"
    const de = process.env.TWILIO_WHATSAPP_FROM?.replace(/^whatsapp:/, '');
    if (!sid || !token || !de) {
      throw new Error('Faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_WHATSAPP_FROM');
    }

    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: `whatsapp:${de}`, To: `whatsapp:${telefono}`, Body: mensaje }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!r.ok) {
      const detalle = (await r.text()).slice(0, 200);
      throw new Error(`Twilio respondio ${r.status}: ${detalle}`);
    }
  }
}
