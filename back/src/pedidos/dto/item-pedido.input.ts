import { InputType, Field, ID, Int, Float } from '@nestjs/graphql';

@InputType()
export class ItemPedidoInput {
  @Field(() => ID)
  productoId: string;

  @Field()
  nombre: string;

  @Field(() => Int)
  cantidad: number;

  @Field(() => Float)
  precioUnit: number;
}