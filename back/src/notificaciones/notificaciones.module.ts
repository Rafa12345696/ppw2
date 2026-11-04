import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module.js';
import { NotificacionesService } from './notificaciones.service.js';
import { WhatsappService } from './whatsapp.service.js';

// Avisos al cliente cuando cambia su pedido: correo (Brevo) y WhatsApp (Twilio)
@Module({
  imports: [MailModule],
  providers: [NotificacionesService, WhatsappService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
