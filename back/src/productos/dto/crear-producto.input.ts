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

  // Opcional: precio anterior para mostrar la promocion. Debe ser mayor que precio.
  @Field(() => Float, { nullable: true })
  precioAntes?: number;

  @Field(() => Boolean, { nullable: true })
  premium?: boolean;
}
