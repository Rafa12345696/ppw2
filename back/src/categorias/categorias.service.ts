import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OBJECT_ID } from '../comun/object-id.js';

@Injectable()
export class CategoriasService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.categoria.findMany();
  }

  // Con un id mal formado Prisma lanza error: mejor responder "no existe"
  findOne(id: string) {
    if (!OBJECT_ID.test(id)) return null;
    return this.prisma.categoria.findUnique({ where: { id } });
  }
}