import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { BitacoraService } from './bitacora.service.js';
import { BitacoraResolver } from './bitacora.resolver.js';
import { BitacoraInterceptor } from './bitacora.interceptor.js';

// Bitacora de acciones del admin guardada en PostgreSQL (la base relacional del proyecto)
@Module({
  providers: [
    BitacoraService,
    BitacoraResolver,
    { provide: APP_INTERCEPTOR, useClass: BitacoraInterceptor },
  ],
})
export class BitacoraModule {}
