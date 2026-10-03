import { Module } from '@nestjs/common';
import { CategoriasService } from './categorias.service.js';
import { CategoriasResolver } from './categorias.resolver.js';

@Module({
  providers: [CategoriasService, CategoriasResolver],
})
export class CategoriasModule {}