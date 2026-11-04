import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller.js';
import { McpService } from './mcp.service.js';
import { ProductosModule } from '../productos/productos.module.js';

// Servidor MCP de solo lectura en POST /mcp
@Module({
  imports: [ProductosModule],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
