import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Usuario, Rol } from './usuarios.model.js';
import { UsuariosService } from './usuarios.service.js';
import { CrearUsuarioInput } from './dto/crear-usuario.input.js';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserAuthContext } from '../auth/types/auth.types.js';

@Resolver(() => Usuario)
export class UsuariosResolver {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Query(() => [Usuario])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  usuarios() {
    return this.usuariosService.findAll();
  }

  @Mutation(() => Usuario)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  crearUsuario(@Args('data') data: CrearUsuarioInput) {
    return this.usuariosService.crearComoAdmin(data);
  }

  @Mutation(() => Usuario)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  cambiarEstadoUsuario(
    @Args('id', { type: () => ID }) id: string,
    @Args('activo', { type: () => Boolean }) activo: boolean,
    @CurrentUser() admin: UserAuthContext,
  ) {
    return this.usuariosService.cambiarEstado(id, activo, admin.userId);
  }
}