import { Resolver, Query, Mutation } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { IdentidadService } from './identidad.service.js';
import { EstadoIdentidad, SesionIdentidad } from './identidad.models.js';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserAuthContext } from '../auth/types/auth.types.js';

@Resolver()
export class IdentidadResolver {
  constructor(private readonly identidad: IdentidadService) {}

  @Query(() => EstadoIdentidad)
  @UseGuards(GqlAuthGuard)
  miVerificacion(@CurrentUser() user: UserAuthContext) {
    return this.identidad.estado(user.userId);
  }

  @Mutation(() => SesionIdentidad)
  @UseGuards(GqlAuthGuard)
  iniciarVerificacion(@CurrentUser() user: UserAuthContext) {
    return this.identidad.iniciar(user.userId);
  }
}
