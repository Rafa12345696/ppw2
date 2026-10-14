import { Module } from '@nestjs/common';
import { EstadisticasService } from './estadisticas.service.js';
import { EstadisticasResolver } from './estadisticas.resolver.js';

@Module({
  providers: [EstadisticasService, EstadisticasResolver],
})
export class EstadisticasModule {}