import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Estadisticas } from './estadisticas.model.js';
import { EstadisticasService } from './estadisticas.service.js';
import { Rol } from '../usuarios/usuarios.model.js';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Resolver(() => Estadisticas)
export class EstadisticasResolver {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Query(() => Estadisticas)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  estadisticas(
    @Args('dias', { type: () => Int, nullable: true, defaultValue: 30 }) dias: number,
  ) {
    return this.estadisticasService.obtener(dias);
  }
}