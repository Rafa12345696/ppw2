import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { LoginInput } from './dto/login.input.js';
import { RegistrarInput } from './dto/registrar.input.js';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
  ) {}

  async registrar(data: RegistrarInput) {
    const existente = await this.usuariosService.findByEmail(data.email);
    if (existente) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    const passwordHasheado = await bcrypt.hash(data.password, 10);

    const usuario = await this.usuariosService.create({
      nombre: data.nombre,
      email: data.email,
      password: passwordHasheado,
      rol: 'CLIENTE',
    });

    return this.generarRespuesta(usuario);
  }

 async login(data: LoginInput) {
    const usuario = await this.usuariosService.findByEmail(data.email);
    if (!usuario) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const passwordValido = await bcrypt.compare(data.password, usuario.password!);
    if (!passwordValido) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    return this.generarRespuesta(usuario);
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