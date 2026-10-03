import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Producto } from './producto.model.js';
import { Categoria } from '../categorias/categoria.model.js';
import { ProductosService } from './productos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CrearProductoInput } from './dto/crear-producto.input.js';
import { ActualizarProductoInput } from './dto/actualizar-producto.input.js';

// Importaciones de Autenticación y Guardias
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Rol } from '../usuarios/usuarios.model.js';

@Resolver(() => Producto)
export class ProductosResolver {
  constructor(
    private readonly productosService: ProductosService,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => [Producto])
  productos(
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 }) take: number,
  ) {
    return this.productosService.findAll(skip, take);
  }

  @Query(() => Producto, { nullable: true })
  productoPorId(@Args('id', { type: () => ID }) id: string) {
    return this.productosService.findOne(id);
  }

  @Query(() => [Producto])
  productosPorCategoria(@Args('categoriaId', { type: () => ID }) categoriaId: string) {
    return this.productosService.findByCategoria(categoriaId);
  }

  @Mutation(() => Producto)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  crearProducto(@Args('data') data: CrearProductoInput) {
    return this.productosService.create(data);
  }

  @Mutation(() => Producto)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  actualizarProducto(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: ActualizarProductoInput,
  ) {
    return this.productosService.update(id, data);
  }

  @Mutation(() => Producto)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  eliminarProducto(@Args('id', { type: () => ID }) id: string) {
    return this.productosService.remove(id);
  }

  @ResolveField(() => Categoria, { nullable: true })
  categoria(@Parent() producto: Producto) {
    return this.prisma.categoria.findUnique({ where: { id: producto.categoriaId } });
  }
}