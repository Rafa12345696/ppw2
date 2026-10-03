import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { Categoria } from '../categorias/categoria.model.js';

@ObjectType()
export class Producto {
  @Field(() => ID)
  id: string;

  @Field()
  nombre: string;

  @Field(() => Float)
  precio: number;

  @Field(() => Int)
  stock: number;

  @Field()
  descripcion: string;

  @Field()
  imagen: string;

  @Field(() => ID)
  categoriaId: string;

  @Field(() => Categoria, { nullable: true })
  categoria?: Categoria;
}