import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport'; 
import { ProductosService } from './productos.service.js';
import { ProductosResolver } from './productos.resolver.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })], 
  providers: [ProductosService, ProductosResolver],
})
export class ProductosModule {}