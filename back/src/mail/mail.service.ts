import { Injectable } from '@nestjs/common';
import { createTransport } from 'nodemailer';

function escapar(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class MailService {
  private crearTransporte() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
      throw new Error('Faltan GMAIL_USER o GMAIL_APP_PASSWORD en el .env');
    }
    return { user, transporte: createTransport({ service: 'gmail', auth: { user, pass } }) };
  }

  async enviarRecuperacion(destino: string, nombre: string, enlace: string) {
    const { user, transporte } = this.crearTransporte();

    await transporte.sendMail({
      from: `"Elixir" <${user}>`,
      to: destino,
      subject: 'Recupera tu contraseña de Elixir',
      text:
        `Hola ${nombre},\n\n` +
        `Recibimos una solicitud para restablecer tu contraseña. ` +
        `Abre este enlace (vale 1 hora):\n${enlace}\n\n` +
        `Si no fuiste tu, ignora este correo.`,
      html:
        `<p>Hola ${escapar(nombre)},</p>` +
        `<p>Recibimos una solicitud para restablecer tu contraseña. El enlace vale 1 hora.</p>` +
        `<p><a href="${enlace}">Restablecer contraseña</a></p>` +
        `<p>Si no fuiste tu, ignora este correo.</p>`,
    });
  }
}