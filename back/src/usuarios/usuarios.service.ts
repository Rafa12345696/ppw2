import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { Rol } from './usuarios.model.js';
import { CrearUsuarioInput } from './dto/crear-usuario.input.js';
import { OBJECT_ID } from '../comun/object-id.js';
import { leerFechaNacimiento } from '../comun/edad.js';
import { normalizarTelefono } from '../comun/telefono.js';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  create(data: {
    nombre: string;
    email: string;
    password: string;
    rol?: 'CLIENTE' | 'ADMIN';
    fechaNacimiento?: Date;
    telefono?: string | null;
  }) {
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

  // Para cuentas sin fecha (viejas o creadas por el admin). Una vez guardada ya no se puede cambiar.
  async confirmarFechaNacimiento(id: string, texto: string) {
    const fecha = leerFechaNacimiento(texto);

    const usuario = await this.findById(id);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (usuario.fechaNacimiento) return usuario;

    return this.prisma.usuario.update({ where: { id }, data: { fechaNacimiento: fecha } });
  }

  // Vacio quita el telefono (deja de recibir WhatsApp)
  async actualizarTelefono(id: string, texto?: string | null) {
    const telefono = normalizarTelefono(texto);
    if (!(await this.findById(id))) throw new NotFoundException('Usuario no encontrado');
    return this.prisma.usuario.update({ where: { id }, data: { telefono } });
  }
}