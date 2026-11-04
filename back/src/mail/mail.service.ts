import { Injectable } from '@nestjs/common';

export function escapar(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface Correo {
  para: string;
  nombre: string;
  asunto: string;
  texto: string;
  html: string;
}

// Correo por la API HTTPS de Brevo. Render gratis bloquea los puertos SMTP, por eso no se usa Gmail directo.
@Injectable()
export class MailService {
  configurado() {
    return Boolean(process.env.BREVO_API_KEY && process.env.MAIL_REMITENTE);
  }

  async enviar(correo: Correo) {
    const apiKey = process.env.BREVO_API_KEY;
    const remitente = process.env.MAIL_REMITENTE;
    if (!apiKey || !remitente) {
      throw new Error('Faltan BREVO_API_KEY o MAIL_REMITENTE en las variables de entorno');
    }

    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Elixir', email: remitente },
        to: [{ email: correo.para, name: correo.nombre }],
        subject: correo.asunto,
        textContent: correo.texto,
        htmlContent: correo.html,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!r.ok) {
      const detalle = (await r.text()).slice(0, 200);
      throw new Error(`Brevo respondio ${r.status}: ${detalle}`);
    }
  }

  enviarRecuperacion(destino: string, nombre: string, enlace: string) {
    return this.enviar({
      para: destino,
      nombre,
      asunto: 'Recupera tu contraseña de Elixir',
      texto:
        `Hola ${nombre},\n\n` +
        `Recibimos una solicitud para restablecer tu contraseña. ` +
        `Abre este enlace (vale 1 hora):\n${enlace}\n\n` +
        `Si no fuiste tu, ignora este correo.`,
      html:
        `<p>Hola ${escapar(nombre)},</p>` +
        `<p>Recibimos una solicitud para restablecer tu contraseña. El enlace vale 1 hora.</p>` +
        `<p><a href="${escapar(enlace)}">Restablecer contraseña</a></p>` +
        `<p>Si no fuiste tu, ignora este correo.</p>`,
    });
  }
}
