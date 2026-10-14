import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { LoginInput } from './dto/login.input.js';
import { RegistrarInput } from './dto/registrar.input.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  private normalizar(email: string) {
    return email.trim().toLowerCase();
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async registrar(data: RegistrarInput) {
    if (data.password.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    }

    const email = this.normalizar(data.email);
    const existente = await this.usuariosService.findByEmail(email);
    if (existente) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    const passwordHasheado = await bcrypt.hash(data.password, 10);

    const usuario = await this.usuariosService.create({
      nombre: data.nombre.trim(),
      email,
      password: passwordHasheado,
      rol: 'CLIENTE',
    });

    return this.generarRespuesta(usuario);
  }

  async login(data: LoginInput) {
    const usuario = await this.usuariosService.findByEmail(this.normalizar(data.email));
    if (!usuario) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    if (usuario.activo === false) { throw new UnauthorizedException('Esta cuenta esta desactivada'); }
    const passwordValido = await bcrypt.compare(data.password, usuario.password!);
    if (!passwordValido) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    return this.generarRespuesta(usuario);
  }

  // Siempre responde true, exista o no el correo, para no revelar quien esta registrado
  async solicitarRecuperacion(emailEntrada: string) {
    const usuario = await this.usuariosService.findByEmail(this.normalizar(emailEntrada));
    if (!usuario) return true;

    // Evita que alguien llene el buzon de otra persona: maximo 1 correo por minuto
    const reciente = await this.prisma.passwordResetToken.findFirst({
      where: { usuarioId: usuario.id, createdAt: { gt: new Date(Date.now() - 60_000) } },
    });
    if (reciente) return true;

    // Invalida los enlaces anteriores sin usar
    await this.prisma.passwordResetToken.updateMany({
      where: { usuarioId: usuario.id, usado: false },
      data: { usado: true },
    });

    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash: this.hashToken(token),
        usuarioId: usuario.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const base = process.env.FRONTEND_URL || 'http://localhost:4321';
    const enlace = `${base}/restablecer-password?token=${token}`;

    this.mailService
      .enviarRecuperacion(usuario.email, usuario.nombre, enlace)
      .catch((e: Error) =>
        this.logger.error(`No se pudo enviar el correo de recuperacion: ${e.message}`),
      );

    return true;
  }

  async restablecerPassword(token: string, password: string) {
    if (password.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    }

    const registro = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });

    if (!registro || registro.usado || registro.expiresAt < new Date()) {
      throw new BadRequestException('El enlace no es valido o ya expiro. Solicita uno nuevo.');
    }

    // Se marca como usado antes de cambiar la contraseña, para que no se pueda usar dos veces
    const reclamado = await this.prisma.passwordResetToken.updateMany({
      where: { id: registro.id, usado: false },
      data: { usado: true },
    });
    if (reclamado.count === 0) {
      throw new BadRequestException('El enlace no es valido o ya expiro. Solicita uno nuevo.');
    }

    const passwordHasheado = await bcrypt.hash(password, 10);
    await this.prisma.usuario.update({
      where: { id: registro.usuarioId },
      data: { password: passwordHasheado },
    });

    return true;
  }

  private generarRespuesta(usuario: { id: string; email: string; rol: string; nombre: string }) {
    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      usuario,
    };
  }
}