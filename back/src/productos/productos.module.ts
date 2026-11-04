import { Module } from '@nestjs/common';
import { ProductosService } from './productos.service.js';
import { ProductosResolver } from './productos.resolver.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  providers: [ProductosService, ProductosResolver],
  // El servidor MCP reutiliza masVendidos
  exports: [ProductosService],
})
export class ProductosModule {}