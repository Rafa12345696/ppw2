import { InputType, Field, Int, Float, ID } from '@nestjs/graphql';

@InputType()
export class CrearProductoInput {
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
}