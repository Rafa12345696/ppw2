import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { IdentidadService } from './identidad.service.js';

@Controller('webhooks')
export class IdentidadController {
  constructor(private readonly identidad: IdentidadService) {}

  @Post('didit')
  @HttpCode(200)
  async didit(@Body() body: any, @Headers() headers: Record<string, string | undefined>) {
    await this.identidad.procesarWebhook(body, headers);
    return { ok: true };
  }
}
