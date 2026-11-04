import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BitacoraService } from './bitacora.service.js';
import { BitacoraPagina, FiltroBitacora } from './bitacora.models.js';
import { Rol } from '../usuarios/usuarios.model.js';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
export class BitacoraResolver {
  constructor(private readonly bitacora: BitacoraService) {}

  @Query(() => BitacoraPagina)
  bitacoraPagina(
    @Args('filtro', { type: () => FiltroBitacora, nullable: true }) filtro?: FiltroBitacora,
    @Args('pagina', { type: () => Int, nullable: true }) pagina?: number,
    @Args('porPagina', { type: () => Int, nullable: true }) porPagina?: number,
  ) {
    return this.bitacora.pagina(filtro, pagina, porPagina);
  }
}
