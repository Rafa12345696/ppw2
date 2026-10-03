import { Resolver, Query, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { Categoria } from './categoria.model.js';
import { Producto } from '../productos/producto.model.js';
import { CategoriasService } from './categorias.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Resolver(() => Categoria)
export class CategoriasResolver {
  constructor(
    private readonly categoriasService: CategoriasService,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => [Categoria])
  categorias() {
    return this.categoriasService.findAll();
  }

  @Query(() => Categoria, { nullable: true })
  categoriaPorId(@Args('id', { type: () => ID }) id: string) {
    return this.categoriasService.findOne(id);
  }

  @ResolveField(() => [Producto])
  productos(@Parent() categoria: Categoria) {
    return this.prisma.producto.findMany({ where: { categoriaId: categoria.id } });
  }
}