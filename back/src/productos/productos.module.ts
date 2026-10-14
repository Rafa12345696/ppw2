import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ProductosService } from './productos.service.js';
import { ProductosResolver } from './productos.resolver.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule, PassportModule],
  providers: [ProductosService, ProductosResolver],
})
export class ProductosModule {}