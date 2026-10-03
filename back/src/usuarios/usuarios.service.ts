import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  create(data: { nombre: string; email: string; password: string; rol?: 'CLIENTE' | 'ADMIN' }) {
    return this.prisma.usuario.create({ data });
  }
}