import { Controller, Post, Body, Query, Headers, HttpCode } from '@nestjs/common';
import { PagosService } from './pagos.service.js';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly pagosService: PagosService) {}

  @Post('mercadopago')
  @HttpCode(200)
  async mercadopago(
    @Query() query: Record<string, string>,
    @Body() body: any,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    await this.pagosService.procesarWebhookMP(query, body, headers);
    return { ok: true };
  }

  @Post('paypal')
  @HttpCode(200)
  async paypal(
    @Body() body: any,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    await this.pagosService.procesarWebhookPayPal(headers, body);
    return { ok: true };
  }
}