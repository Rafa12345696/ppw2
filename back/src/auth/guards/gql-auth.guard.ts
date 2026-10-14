import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { JWT_SECRET } from '../auth.constants.js';
import type { JwtPayload } from '../types/auth.types.js';

@Injectable()
export class GqlAuthGuard implements CanActivate {
  private readonly jwt = new JwtService({ secret: JWT_SECRET });

  canActivate(context: ExecutionContext): boolean {
    const req = GqlExecutionContext.create(context).getContext().req;
    const header: string | undefined = req?.headers?.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de acceso');
    }

    try {
      const payload = this.jwt.verify<JwtPayload>(header.slice(7));
      req.user = { userId: payload.sub, email: payload.email, rol: payload.rol };
      return true;
    } catch {
      throw new UnauthorizedException('Token invalido o expirado');
    }
  }
}