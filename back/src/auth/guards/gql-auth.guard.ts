import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { JWT_SECRET } from '../auth.constants.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from '../types/auth.types.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;

@Injectable()
export class GqlAuthGuard implements CanActivate {
  private readonly jwt = new JwtService({ secret: JWT_SECRET });

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = GqlExecutionContext.create(context).getContext().req;
    const header: string | undefined = req?.headers?.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de acceso');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(header.slice(7));
    } catch {
      throw new UnauthorizedException('Token invalido o expirado');
    }

    if (!payload.sub || !OBJECT_ID.test(payload.sub)) {
      throw new UnauthorizedException('Token invalido o expirado');
    }

    // El rol y el estado salen de la base, no del token: un usuario desactivado pierde acceso al instante
    const usuario = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
    if (!usuario || usuario.activo === false) {
      throw new UnauthorizedException('Tu cuenta no esta disponible');
    }

    req.user = { userId: usuario.id, email: usuario.email, rol: usuario.rol };
    return true;
  }
}