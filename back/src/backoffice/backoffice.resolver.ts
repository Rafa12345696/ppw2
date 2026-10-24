import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BackofficeService } from './backoffice.service.js';
import {
  FiltroProductos,
  FiltroPedidos,
  FiltroFacturas,
  FiltroPagos,
  FiltroUsuarios,
  ActualizarUsuarioInput,
  CategoriaAdmin,
  ProductosPagina,
  PedidosPagina,
  PagosPagina,
  UsuariosPagina,
} from './backoffice.models.js';
import { Usuario, Rol } from '../usuarios/usuarios.model.js';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserAuthContext } from '../auth/types/auth.types.js';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
export class BackofficeResolver {
  constructor(private readonly servicio: BackofficeService) {}

  // ---------- consultas con busqueda, filtros y paginacion ----------

  @Query(() => ProductosPagina)
  productosPagina(
    @Args('filtro', { type: () => FiltroProductos, nullable: true }) filtro?: FiltroProductos,
    @Args('pagina', { type: () => Int, nullable: true }) pagina?: number,
    @Args('porPagina', { type: () => Int, nullable: true }) porPagina?: number,
  ) {
    return this.servicio.productosPagina(filtro, pagina, porPagina);
  }

  @Query(() => PedidosPagina)
  pedidosPagina(
    @Args('filtro', { type: () => FiltroPedidos, nullable: true }) filtro?: FiltroPedidos,
    @Args('pagina', { type: () => Int, nullable: true }) pagina?: number,
    @Args('porPagina', { type: () => Int, nullable: true }) porPagina?: number,
  ) {
    return this.servicio.pedidosPagina(filtro, pagina, porPagina);
  }

  @Query(() => PedidosPagina)
  facturasPagina(
    @Args('filtro', { type: () => FiltroFacturas, nullable: true }) filtro?: FiltroFacturas,
    @Args('pagina', { type: () => Int, nullable: true }) pagina?: number,
    @Args('porPagina', { type: () => Int, nullable: true }) porPagina?: number,
  ) {
    return this.servicio.facturasPagina(filtro, pagina, porPagina);
  }

  @Query(() => String)
  exportarFacturasCsv(
    @Args('filtro', { type: () => FiltroFacturas, nullable: true }) filtro?: FiltroFacturas,
  ) {
    return this.servicio.exportarFacturasCsv(filtro);
  }

  @Query(() => PagosPagina)
  pagosPagina(
    @Args('filtro', { type: () => FiltroPagos, nullable: true }) filtro?: FiltroPagos,
    @Args('pagina', { type: () => Int, nullable: true }) pagina?: number,
    @Args('porPagina', { type: () => Int, nullable: true }) porPagina?: number,
  ) {
    return this.servicio.pagosPagina(filtro, pagina, porPagina);
  }

  @Query(() => UsuariosPagina)
  usuariosPagina(
    @Args('filtro', { type: () => FiltroUsuarios, nullable: true }) filtro?: FiltroUsuarios,
    @Args('pagina', { type: () => Int, nullable: true }) pagina?: number,
    @Args('porPagina', { type: () => Int, nullable: true }) porPagina?: number,
  ) {
    return this.servicio.usuariosPagina(filtro, pagina, porPagina);
  }

  // ---------- usuarios ----------

  @Mutation(() => Usuario)
  actualizarUsuario(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: ActualizarUsuarioInput,
    @CurrentUser() admin: UserAuthContext,
  ) {
    return this.servicio.actualizarUsuario(id, data, admin.userId);
  }

  @Mutation(() => Boolean)
  restablecerPasswordUsuario(
    @Args('id', { type: () => ID }) id: string,
    @Args('password') password: string,
  ) {
    return this.servicio.restablecerPassword(id, password);
  }

  // ---------- categorias ----------

  @Query(() => [CategoriaAdmin])
  categoriasAdmin() {
    return this.servicio.categoriasAdmin();
  }

  @Mutation(() => CategoriaAdmin)
  crearCategoria(@Args('nombre') nombre: string) {
    return this.servicio.crearCategoria(nombre);
  }

  @Mutation(() => CategoriaAdmin)
  actualizarCategoria(
    @Args('id', { type: () => ID }) id: string,
    @Args('nombre') nombre: string,
  ) {
    return this.servicio.actualizarCategoria(id, nombre);
  }

  @Mutation(() => Boolean)
  eliminarCategoria(@Args('id', { type: () => ID }) id: string) {
    return this.servicio.eliminarCategoria(id);
  }
}