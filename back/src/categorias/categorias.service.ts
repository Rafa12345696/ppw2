import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CategoriasService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.categoria.findMany();
  }

  findOne(id: string) {
    return this.prisma.categoria.findUnique({ where: { id } });
  }
}