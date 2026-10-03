import { InputType, Field, Int, Float } from '@nestjs/graphql';

@InputType()
export class ActualizarProductoInput {
  @Field({ nullable: true })
  nombre?: string;

  @Field(() => Float, { nullable: true })
  precio?: number;

  @Field(() => Int, { nullable: true })
  stock?: number;

  @Field({ nullable: true })
  descripcion?: string;

  @Field({ nullable: true })
  imagen?: string;
}