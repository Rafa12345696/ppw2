import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service.js';
import { UsuariosResolver } from './usuarios.resolver.js';

@Module({
  providers: [UsuariosService, UsuariosResolver],
  exports: [UsuariosService],
})
export class UsuariosModule {}