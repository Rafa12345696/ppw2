import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CrearProductoInput } from './dto/crear-producto.input.js';
import { ActualizarProductoInput } from './dto/actualizar-producto.input.js';

@Injectable()
export class ProductosService {
  constructor(private prisma: PrismaService) {}

  findAll(skip: number, take: number) {
    return this.prisma.producto.findMany({ skip, take });
  }

  findOne(id: string) {
    return this.prisma.producto.findUnique({ where: { id } });
  }

  findByCategoria(categoriaId: string) {
    return this.prisma.producto.findMany({ where: { categoriaId } });
  }

  create(data: CrearProductoInput) {
    return this.prisma.producto.create({ data });
  }

  update(id: string, data: ActualizarProductoInput) {
    return this.prisma.producto.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.producto.delete({ where: { id } });
  }
}