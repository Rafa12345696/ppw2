import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext, type GqlContextType } from '@nestjs/graphql';
import { tap } from 'rxjs';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';
import { Rol } from '../usuarios/usuarios.model.js';
import type { UserAuthContext } from '../auth/types/auth.types.js';
import { BitacoraService } from './bitacora.service.js';

// Registra en la bitacora cada mutation marcada con @Roles(Rol.ADMIN) que termina bien.
// Asi no hay que tocar cada resolver: cualquier accion de admin nueva queda registrada sola.
@Injectable()
export class BitacoraInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly bitacora: BitacoraService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType<GqlContextType>() !== 'graphql') return next.handle();

    const gql = GqlExecutionContext.create(context);
    if (gql.getInfo()?.parentType?.name !== 'Mutation') return next.handle();

    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.includes(Rol.ADMIN)) return next.handle();

    // Los guards ya corrieron: aqui el admin ya esta verificado
    const admin = gql.getContext().req?.user as UserAuthContext | undefined;
    const accion = gql.getInfo().fieldName as string;
    const args = gql.getArgs<Record<string, unknown>>();

    return next.handle().pipe(
      tap((resultado: unknown) => {
        if (!admin) return;
        const idResultado = (resultado as { id?: unknown } | null)?.id;
        const entidadId = args.id ?? args.pedidoId ?? idResultado;
        void this.bitacora.registrar({
          adminId: admin.userId,
          adminEmail: admin.email,
          accion,
          entidadId: typeof entidadId === 'string' ? entidadId : null,
          args,
        });
      }),
    );
  }
}
