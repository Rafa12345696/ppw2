import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { Rol } from './usuarios.model.js';
import { CrearUsuarioInput } from './dto/crear-usuario.input.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;

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

  findAll() {
    return this.prisma.usuario.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async crearComoAdmin(data: CrearUsuarioInput) {
    const nombre = data.nombre.trim();
    const email = data.email.trim().toLowerCase();

    if (!nombre) throw new BadRequestException('El nombre es obligatorio');
    if (data.password.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    }
    if (await this.findByEmail(email)) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    return this.prisma.usuario.create({
      data: {
        nombre,
        email,
        password: await bcrypt.hash(data.password, 10),
        rol: data.rol === Rol.ADMIN ? 'ADMIN' : 'CLIENTE',
      },
    });
  }

  async cambiarEstado(id: string, activo: boolean, adminId: string) {
    if (!OBJECT_ID.test(id)) throw new NotFoundException('Usuario no encontrado');
    if (!activo && id === adminId) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    if (!(await this.findById(id))) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.usuario.update({ where: { id }, data: { activo } });
  }
}