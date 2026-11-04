import { Module } from '@nestjs/common';
import { IdentidadService } from './identidad.service.js';
import { IdentidadResolver } from './identidad.resolver.js';
import { IdentidadController } from './identidad.controller.js';
import { AuthModule } from '../auth/auth.module.js';

// Verificacion de identidad con INE + selfie usando Didit
@Module({
  imports: [AuthModule],
  controllers: [IdentidadController],
  providers: [IdentidadService, IdentidadResolver],
})
export class IdentidadModule {}
